import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { acceptFriend, requestFriend, unfriend } from '@/api/dayed'
import type { FriendState, UserCard } from '@/api/types'
import { colors, radius, space, text } from '@/theme'

interface Props {
  user: UserCard
}

/**
 * 관계 버튼 — 네 상태를 한 부품이 다 맡는다.
 * 상태가 바뀌면 그 사람이 등장하는 모든 목록(친구·요청함·검색·프로필)이 같이 변해야 해서
 * 성공하면 통째로 무효화한다. 화면마다 따로 캐시를 만지면 반드시 어긋난다.
 */
export default function FriendButton({ user }: Props) {
  const queryClient = useQueryClient()

  const run = useMutation({
    mutationFn: (next: 'request' | 'accept' | 'remove') =>
      next === 'request' ? requestFriend(user.id) : next === 'accept' ? acceptFriend(user.id) : unfriend(user.id),
    onSuccess: () => queryClient.invalidateQueries(),
  })

  const go = (next: 'request' | 'accept' | 'remove') => {
    Haptics.selectionAsync().catch(() => undefined)
    run.mutate(next)
  }

  /** 되돌리기 어려운 쪽만 한 번 묻는다 */
  const confirm = (title: string, message: string, label: string) =>
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel' },
      { text: label, style: 'destructive', onPress: () => go('remove') },
    ])

  if (run.isPending) {
    return (
      <View style={[styles.btn, styles.ghost]}>
        <ActivityIndicator size="small" color={colors.sub} />
      </View>
    )
  }

  const label: Record<FriendState, string> = {
    none: '친구 요청',
    requested: '요청함',
    incoming: '수락',
    friends: '친구',
  }

  // 받은 요청만 버튼이 둘이다 — 수락과 거절이 대등한 선택이라 하나에 숨기지 않는다
  if (user.friendState === 'incoming') {
    return (
      <View style={styles.pair}>
        <Pressable style={[styles.btn, styles.solid]} onPress={() => go('accept')}>
          <Text style={styles.solidText}>수락</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.ghost]} onPress={() => go('remove')}>
          <Text style={styles.ghostText}>거절</Text>
        </Pressable>
      </View>
    )
  }

  const onPress = () => {
    if (user.friendState === 'none') return go('request')
    if (user.friendState === 'requested')
      return confirm('요청을 취소할까요?', `${user.name}님에게 보낸 친구 요청이 사라져요.`, '취소하기')
    return confirm('친구를 끊을까요?', `서로의 기록이 더 이상 보이지 않아요. ${user.name}님에게 알림은 가지 않아요.`, '끊기')
  }

  const solid = user.friendState === 'none'
  return (
    <Pressable style={[styles.btn, solid ? styles.solid : styles.ghost]} onPress={onPress}>
      {user.friendState === 'friends' && <Ionicons name="checkmark" size={13} color={colors.sub} />}
      <Text style={solid ? styles.solidText : styles.ghostText}>{label[user.friendState]}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: space.sm },
  // 최소 너비를 잡아둬야 글자가 바뀔 때 줄이 흔들리지 않는다
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, minWidth: 72, height: 30, paddingHorizontal: 12, borderRadius: radius.pill },
  solid: { backgroundColor: colors.accent },
  solidText: { fontSize: text.small, fontWeight: '700', color: '#fff' },
  ghost: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.surface },
  ghostText: { fontSize: text.small, fontWeight: '600', color: colors.sub },
})
