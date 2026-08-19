import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'
import type { FeedItem, Visibility } from '@/api/types'
import PostComments from '@/components/feed/PostComments'
import Avatar from '@/components/ui/Avatar'
import FoldableText from '@/components/ui/FoldableText'
import { PHOTO_RATIO } from '@/config'
import { NOTE_FONT, paperOf } from '@/lib/paper'
import { colors, radius, space, text } from '@/theme'

/**
 * 카드 한 장의 치수.
 * 히어로가 날아가 앉을 좌표를 계산으로 구해야 해서 밖에서도 알아야 한다.
 */
export const CARD = {
  /** 카드 바깥 좌우 여백 */
  gutter: space.lg,
  /** 카드 안쪽 여백 */
  pad: space.lg,
  /** 머리글 높이 — 고정이라야 사진 자리를 계산할 수 있다 */
  head: 44,
  /** 카드 안 요소끼리의 틈. **여기 하나가 카드 안 모든 세로 간격이다** */
  gap: space.md,
} as const

/** 카드 안 사진 크기 — 폭은 카드 안쪽 폭, 높이는 사진 비율 그대로 */
export function cardPhoto(screenW: number) {
  const w = screenW - (CARD.gutter + CARD.pad) * 2
  return { w, h: Math.round(w / PHOTO_RATIO) }
}

/** 공개 범위 알약 — 내 기록에만 붙는다. 기본값(친구 공개)도 적어야 '아직 안 정함'과 안 헷갈린다 */
function VisibilityChip({ visibility }: { visibility: Visibility }) {
  const only = visibility === 'private'
  return (
    <View style={[styles.chip, only && styles.chipOnly]}>
      <Ionicons name={only ? 'lock-closed' : 'people'} size={11} color={only ? '#fff' : colors.sub} />
      <Text style={[styles.chipText, only && styles.chipTextOnly]}>{only ? '나만 보기' : '친구에게 공개'}</Text>
    </View>
  )
}

interface Props {
  item: FeedItem
  dateLabel: string
  onToggleLike?: () => void
  onCommentsChanged: () => void
  /** 이름을 눌렀을 때. 내 기록이면 갈 곳이 없어 안 준다 */
  onOpenProfile?: () => void
  /** 내 기록일 때만 — 기록 관리 시트 */
  onMore?: () => void
  /** 연 하루는 댓글이 처음부터 펼쳐져 있고, 이어지는 칸은 눌러야 열린다 */
  comments?: 'open' | 'toggle'
  /** 히어로가 앉는 칸에서 사진 자리를 감추고 드러내는 애니메이션 스타일 */
  slotStyle?: StyleProp<ViewStyle>
}

/**
 * 하루 한 장 — **이 앱의 유일한 카드.**
 *
 * 자리가 여섯 개 고정이고 그중 둘은 비어 있을 수 있다:
 * `머리글 · 사진 · 글? · 날짜 · 반응 · 댓글?`
 *
 * 세로 간격은 카드의 `gap` **하나뿐**이다. 요소마다 제 여백을 들려주면
 * 글이 없는 날 · 댓글이 닫힌 날마다 다른 리듬이 나온다.
 */
export default function PostCard({
  item, dateLabel, onToggleLike, onCommentsChanged, onOpenProfile, onMore,
  comments = 'toggle', slotStyle,
}: Props) {
  const { width } = useWindowDimensions()
  const photo = cardPhoto(width)
  const [open, setOpen] = useState(comments === 'open')
  const pp = paperOf(item.paper)

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Pressable style={styles.who} onPress={onOpenProfile} disabled={onOpenProfile === undefined}>
          <Avatar name={item.author.name} uri={item.author.avatar} color={item.author.color} size={40} />
          <Text style={styles.name} numberOfLines={1}>{item.author.name}</Text>
          {onOpenProfile !== undefined && <Ionicons name="chevron-forward" size={15} color={colors.faint} />}
        </Pressable>
        {item.mine && !!item.visibility && <VisibilityChip visibility={item.visibility} />}
        {onMore && (
          <Pressable onPress={onMore} hitSlop={10} accessibilityLabel={`${dateLabel} 기록 관리`}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.sub} />
          </Pressable>
        )}
      </View>

      {/* 사진이 없는 날은 같은 자리에 종이가 온다 — 자리가 비지 않아야 카드 모양이 안 흔들린다 */}
      <Animated.View style={[styles.photo, { height: photo.h }, slotStyle]}>
        {item.photos[0] ? (
          <Image source={{ uri: item.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.paper, { backgroundColor: pp.bg }]}>
            <Text style={[styles.note, { color: pp.ink }]}>{item.text}</Text>
          </View>
        )}
      </Animated.View>

      {/* 종이에는 이미 글이 있다 → 아래에 또 쓰지 않는다 */}
      {!!item.photos[0] && !!item.text && <FoldableText style={styles.body}>{item.text}</FoldableText>}

      <Text style={styles.stamp}>{dateLabel}</Text>

      <View style={styles.acts}>
        {/* 내 기록에도 내가 누른다 — 하트는 남에게 보내는 신호가 아니라 이 하루의 표시다 */}
        <Pressable style={styles.act} onPress={onToggleLike} disabled={!onToggleLike} hitSlop={8}>
          <Ionicons
            name={item.likedByMe ? 'heart' : 'heart-outline'}
            size={22}
            color={item.likedByMe ? colors.danger : colors.ink}
          />
          {item.likeCount > 0 && <Text style={styles.count}>{item.likeCount}</Text>}
        </Pressable>
        <Pressable
          style={styles.act}
          onPress={() => setOpen((v) => !v)}
          disabled={comments === 'open'}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.ink} />
          {item.commentCount > 0 && <Text style={styles.count}>{item.commentCount}</Text>}
        </Pressable>
      </View>

      {open && <PostComments itemId={item.id} onChanged={onCommentsChanged} />}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    marginHorizontal: CARD.gutter,
    marginBottom: CARD.gap,
    padding: CARD.pad,
    gap: CARD.gap,
  },

  head: { height: CARD.head, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { flexShrink: 1, fontSize: text.lead, fontWeight: '700', color: colors.ink },

  photo: { borderRadius: radius.photo, overflow: 'hidden', backgroundColor: colors.tile },
  paper: { padding: space.xl },
  note: NOTE_FONT,

  body: { fontSize: text.lead, lineHeight: 22, color: colors.ink },
  stamp: { fontSize: text.caption, color: colors.faint },

  acts: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  act: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  count: { fontSize: text.body, fontWeight: '600', color: colors.ink },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    height: 24, paddingHorizontal: space.sm, borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  chipOnly: { backgroundColor: colors.accent },
  chipText: { fontSize: text.micro, fontWeight: '700', color: colors.sub },
  chipTextOnly: { color: '#fff' },
})
