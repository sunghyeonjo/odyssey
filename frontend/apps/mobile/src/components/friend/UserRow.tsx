import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { UserCard } from '@/api/types'
import FriendButton from '@/components/friend/FriendButton'
import Avatar from '@/components/ui/Avatar'
import { colors, radius, space, text } from '@/theme'

interface Props {
  user: UserCard
  onPress: () => void
  /** 친구인데 오늘 아직 안 남긴 사람만 — 없으면 콕 찌르기 자리가 안 생긴다 */
  onNudge?: () => void
}

/**
 * 사람 한 줄 — 검색 결과 · 친구 목록 · 받은 요청이 같은 모양을 쓴다.
 *
 * 홈의 친구 카드와 **같은 카드**다. 같은 사람을 두 화면에서 다른 모양으로 보여주면
 * 같은 것을 두 번 익혀야 한다. 다른 건 오른쪽에 붙는 것뿐 —
 * 홈은 그냥 들어가는 자리고, 여기는 관계를 손대는 자리다.
 *
 * 친구 피드를 지운 뒤로 이 줄이 둘을 진다 —
 * **누가 오늘을 안 남겼는지 보이는 것**(빨간 점)과 **콕 찌르기**.
 */
export default function UserRow({ user, onPress, onNudge }: Props) {
  const idle = user.friendState === 'friends' && !user.postedToday
  const nudged = !!user.nudgedByMe

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View>
        <Avatar name={user.name} uri={user.avatar} color={user.color} size={40} />
        {user.postedToday && <View style={styles.dot} />}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
        <Text style={styles.handle} numberOfLines={1}>@{user.handle}</Text>
      </View>

      {idle && onNudge ? (
        <Pressable
          style={[styles.nudge, nudged && styles.nudgeOff]}
          onPress={onNudge}
          disabled={nudged}
          hitSlop={6}
        >
          <Ionicons
            name={nudged ? 'checkmark' : 'hand-left-outline'}
            size={13}
            color={nudged ? colors.faint : '#fff'}
          />
          <Text style={[styles.nudgeText, nudged && styles.nudgeTextOff]}>
            {nudged ? '찔렀어요' : '콕 찌르기'}
          </Text>
        </Pressable>
      ) : (
        <FriendButton user={user} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // 홈의 `FriendCardRow` 와 같은 값 — 두 화면에서 같은 사람이 같은 모양으로 보여야 한다
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: space.md,
    paddingHorizontal: 14,
  },
  // 인스타그램의 안 읽음 점 — 얼굴 오른쪽 위, 카드 색으로 한 겹 띄운다
  dot: {
    position: 'absolute', right: -1, top: -1, width: 12, height: 12,
    borderRadius: radius.pill, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface,
  },
  body: { flex: 1, gap: 1 },
  name: { fontSize: text.body, fontWeight: '700', color: colors.ink },
  handle: { fontSize: text.caption, color: colors.sub },

  // 최소 너비를 잡아둬야 '콕 찌르기' → '찔렀어요' 로 바뀔 때 줄이 흔들리지 않는다
  nudge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, minWidth: 92, height: 30, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.accent },
  nudgeOff: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  nudgeText: { fontSize: text.small, fontWeight: '700', color: '#fff' },
  nudgeTextOff: { color: colors.faint },
})
