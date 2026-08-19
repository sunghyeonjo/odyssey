import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { qk } from '@/api/keys'
import { getBlocked, unblockUser } from '@/api/dayed'
import Avatar from '@/components/ui/Avatar'
import { usePullRefresh } from '@/lib/usePullRefresh'
import { colors, radius, space, text } from '@/theme'

/**
 * 차단한 사람 — **풀 수 있는 자리.**
 *
 * 차단만 있고 목록이 없으면 되돌릴 수 없는 일이 된다.
 * 그리고 누구를 차단했는지 기억나지 않으면 "왜 이 사람이 안 보이지" 가 영영 안 풀린다.
 */
export default function BlockedScreen() {
  const navigation = useNavigation<any>()
  const queryClient = useQueryClient()

  const listQ = useQuery({ queryKey: qk.blocked, queryFn: getBlocked })
  const { refreshing, onRefresh } = usePullRefresh(() => listQ.refetch())
  const list = listQ.data ?? []

  const unblock = useMutation({
    mutationFn: (userId: number) => unblockUser(userId),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: () => Alert.alert('차단을 풀지 못했어요', '잠시 후 다시 시도해 주세요'),
  })

  /** 풀어도 친구로 돌아가지는 않는다 — 그 사실을 먼저 알린다 */
  const confirm = (id: number, name: string) =>
    Alert.alert(
      `${name}님 차단을 풀까요?`,
      '이 사람이 다시 나를 찾고 친구 요청을 보낼 수 있어요. 친구로 돌아가지는 않습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '차단 풀기', onPress: () => unblock.mutate(id) },
      ],
    )

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="뒤로">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.navTitle}>차단한 사람</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        {listQ.isPending ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.faint} />
            <Text style={styles.emptyText}>차단한 사람이 없어요</Text>
            <Text style={styles.emptyHint}>
              누군가의 프로필이나 기록에서 <Text style={styles.emptyStrong}>⋯</Text> 를 누르면
              신고하거나 차단할 수 있어요
            </Text>
          </View>
        ) : (
          list.map((u) => (
            <View key={u.id} style={styles.row}>
              <Avatar name={u.name} uri={u.avatar} color={u.color} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
                <Text style={styles.handle} numberOfLines={1}>@{u.handle}</Text>
              </View>
              <Pressable style={styles.undo} onPress={() => confirm(u.id, u.name)} hitSlop={6}>
                <Text style={styles.undoText}>차단 풀기</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
  navTitle: { fontSize: text.title, fontWeight: '700', color: colors.ink },

  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  loading: { alignSelf: 'center', marginVertical: 24 },

  // 친구 목록 줄과 같은 짜임 — 같은 종류의 줄은 같은 모양이어야 한다
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surface, borderRadius: radius.card, padding: space.md,
  },
  name: { fontSize: text.lead, fontWeight: '700', color: colors.ink },
  handle: { fontSize: text.caption, color: colors.sub, marginTop: 2 },
  undo: {
    height: 30, paddingHorizontal: 12, justifyContent: 'center',
    borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  undoText: { fontSize: text.small, fontWeight: '700', color: colors.sub },

  empty: { alignItems: 'center', gap: space.sm, paddingVertical: 40, paddingHorizontal: 30, borderRadius: radius.card, backgroundColor: colors.surface },
  emptyText: { fontSize: text.body, fontWeight: '700', color: colors.ink },
  emptyHint: { fontSize: text.small, lineHeight: 20, color: colors.sub, textAlign: 'center' },
  emptyStrong: { fontWeight: '700', color: colors.ink },
})
