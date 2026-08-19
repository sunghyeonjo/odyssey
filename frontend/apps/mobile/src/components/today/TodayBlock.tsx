import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { FeedItem } from '@/api/types'
import PhotoFrame from '@/components/today/PhotoFrame'
import FoldableText from '@/components/ui/FoldableText'
import { colors, space, text } from '@/theme'

interface Props {
  item: FeedItem
  /**
   * 맨 앞에 붙일 말. 가까이에 날짜가 없는 화면(친구 프로필)에서 `오늘` 을 붙여준다.
   * 홈은 머리글이 이미 오늘 날짜를 말하고 있어 안 붙인다
   */
  lead?: string
  /** 칸을 눌렀을 때 — 상세로 자란다 */
  onPress: () => void
  onToggleLike: () => void
  /** 내 기록일 때만 — 기록 관리 시트 */
  onMore?: () => void
  frameRef?: (v: View | null) => void
}

/**
 * 남긴 하루 한 덩이 — **위에 누가·언제·어디까지, 가운데 사진, 아래에 글과 반응.**
 *
 * 홈 · 내 프로필 · 남의 프로필이 같은 것을 쓴다. 남의 것이면 공개 범위와 `⋯` 가 빠질 뿐
 * 자리와 순서는 같다.
 *
 * 머리글이 사진 **위**에 있는 이유 — 사진을 보기 전에 그게 어떤 하루인지 먼저 알아야 하고,
 * 아래로 내려두면 사진을 보고 나서 눈을 다시 위로 되돌려야 한다. 상세도 같은 차례다.
 */
export default function TodayBlock({ item, lead, onPress, onToggleLike, onMore, frameRef }: Props) {
  // 왼쪽부터 `언제 · 어디까지` — 공개 범위는 내 기록에만 있다(남의 것은 알 길이 없다)
  const meta = [
    lead,
    item.mine && item.visibility ? (item.visibility === 'private' ? '나만 보기' : '친구에게 공개') : null,
  ].filter(Boolean).join(' · ')

  return (
    // 세로 간격은 이 `gap` 하나 — 글이 없는 날에도 리듬이 안 깨진다 (PostCard 와 같은 방식)
    <View style={styles.block}>
      <View style={styles.over}>
        <Text style={styles.overMeta}>{meta}</Text>
        <View style={{ flex: 1 }} />
        {onMore && (
          <Pressable onPress={onMore} hitSlop={10} accessibilityLabel="기록 관리">
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.sub} />
          </Pressable>
        )}
      </View>

      <PhotoFrame
        photo={item.photos[0]}
        note={item.text}
        paper={item.paper}
        onPress={onPress}
        frameRef={frameRef}
      />

      {/* 반응 먼저, 그다음 글 — 상세와 같은 차례. 다르면 상세로 자라는 동안 둘이 자리를 바꾼다 */}
      <View style={styles.acts}>
        <Pressable style={styles.act} onPress={onToggleLike} hitSlop={8}>
          <Ionicons
            name={item.likedByMe ? 'heart' : 'heart-outline'}
            size={19}
            color={item.likedByMe ? colors.danger : colors.sub}
          />
          {item.likeCount > 0 && <Text style={styles.actNum}>{item.likeCount}</Text>}
        </Pressable>
        <View style={styles.act}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.sub} />
          {item.commentCount > 0 && <Text style={styles.actNum}>{item.commentCount}</Text>}
        </View>
      </View>

      {/* 사진이 없으면 글은 이미 종이 위에 있다 → 아래에 또 쓰지 않는다 */}
      {!!item.photos[0] && !!item.text && (
        <FoldableText style={styles.underText}>{item.text}</FoldableText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  // 사진 위 — 언제 · 공개 범위는 왼쪽, 손잡이는 오른쪽 끝
  over: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  overMeta: { fontSize: text.caption, fontWeight: '600', color: colors.sub },

  /*
    사진 아래는 **왼쪽 정렬**. 칸이 폭을 다 쓰므로 글의 축은 칸의 왼쪽 모서리다.
    가운데로 모으면 줄마다 시작점이 달라져 눈이 매번 가운데를 다시 찾아야 하고,
    화면의 다른 글(날짜 · 친구 이름)이 전부 왼쪽에서 시작하는 것과도 어긋난다.
  */
  underText: { paddingHorizontal: 2, fontSize: text.lead, lineHeight: 22, fontWeight: '700', color: colors.ink },
  acts: { flexDirection: 'row', alignItems: 'center', gap: space.xl, paddingHorizontal: 2 },
  act: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actNum: { fontSize: text.caption, fontWeight: '600', color: colors.sub },
})
