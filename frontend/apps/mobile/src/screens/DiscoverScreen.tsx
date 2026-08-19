import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { qk } from '@/api/keys'
import { getFriends, getRequests, nudge, searchUsers } from '@/api/dayed'
import type { UserCard } from '@/api/types'
import FriendToday from '@/components/friend/FriendToday'
import UserRow from '@/components/friend/UserRow'
import { colors, radius, space, text } from '@/theme'

/** 타이핑마다 때리지 않게 — 한 글자 더 칠 시간을 준다 */
const DEBOUNCE_MS = 280

/**
 * 친구 — **탭 하나를 통째로 쓴다.**
 *
 * 한때 `나` 화면 아래에 친구 구역이 붙어 있었는데, 달력 여섯 줄 밑이라 스크롤해야 나왔다.
 * 이 앱의 절반이 화면 밖에 있던 셈이다.
 *
 * 위에서 아래로 **급한 순서**다: 오늘 누가 남겼나 → 답할 요청 → 내 친구.
 * 검색은 늘 맨 위에 있다 — 친구를 늘리는 게 이 화면의 다른 절반이라서다.
 */
export default function DiscoverScreen() {
  const navigation = useNavigation<any>()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [term, setTerm] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setTerm(text.trim()), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [text])

  const searching = term !== ''
  const searchQ = useQuery({ queryKey: qk.search(term), queryFn: () => searchUsers(term), enabled: searching })
  const requestsQ = useQuery({ queryKey: qk.requests, queryFn: getRequests, enabled: !searching })
  const friendsQ = useQuery({ queryKey: qk.friends, queryFn: getFriends, enabled: !searching })

  const openUser = (userId: number) => navigation.navigate('User', { userId })

  // 찔렀다는 표시는 되돌릴 일이 없다 → 캐시를 먼저 칠하고 실패하면 서버 값으로 되돌린다
  const poke = useMutation({
    mutationFn: (userId: number) => nudge(userId),
    onMutate: (userId) =>
      queryClient.setQueryData<UserCard[]>(qk.friends, (prev) =>
        prev?.map((u) => (u.id === userId ? { ...u, nudgedByMe: true } : u)),
      ),
    onError: () => queryClient.invalidateQueries({ queryKey: qk.friends }),
  })

  const onNudge = (userId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
    poke.mutate(userId)
  }

  const requests = requestsQ.data ?? []
  const friends = friendsQ.data ?? []
  const results = searchQ.data ?? []

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>친구</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.faint} />
        <TextInput
          style={styles.search}
          value={text}
          onChangeText={setText}
          placeholder="이름 또는 아이디로 찾기"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {text !== '' && (
          <Pressable onPress={() => setText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.faint} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {searching ? (
          searchQ.isPending ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : results.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={24} color={colors.faint} />
              <Text style={styles.emptyText}>"{term}" 으로 찾은 사람이 없어요</Text>
            </View>
          ) : (
            results.map((u) => <UserRow key={u.id} user={u} onPress={() => openUser(u.id)} />)
          )
        ) : (
          <>
            {/* 오늘 누가 남겼나 — 이 화면에서 제일 먼저 궁금한 것 */}
            <FriendToday friends={friends} onOpenUser={openUser} />

            {requests.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.section}>받은 요청</Text>
                  <Text style={styles.sectionNum}>{requests.length}</Text>
                </View>
                {requests.map((u) => <UserRow key={u.id} user={u} onPress={() => openUser(u.id)} />)}
              </>
            )}

            {friendsQ.isPending && <ActivityIndicator color={colors.accent} style={styles.loading} />}

            {friends.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.section}>내 친구</Text>
                  <Text style={styles.sectionNum}>{friends.length}</Text>
                </View>
                {friends.map((u) => (
                  <UserRow key={u.id} user={u} onPress={() => openUser(u.id)} onNudge={() => onNudge(u.id)} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  navBar: { paddingHorizontal: 16, paddingVertical: 12 },
  navTitle: { fontSize: text.title, fontWeight: '700', color: colors.ink },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginHorizontal: 16, marginBottom: space.sm, paddingHorizontal: 16, height: 44, borderRadius: radius.pill, backgroundColor: colors.surface },
  search: { flex: 1, fontSize: text.lead, color: colors.ink, padding: 0 },

  // 다른 화면들과 같은 바닥 여백 — 목록만 32 라 마지막 줄이 화면 끝에 붙어 보였다
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  // 홈의 `친구 2/13` 과 같은 짜임 — 이름은 왼쪽, 수는 오른쪽 끝
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 2 },
  section: { fontSize: text.small, fontWeight: '700', color: colors.sub },
  sectionNum: { fontSize: text.small, fontWeight: '600', color: colors.faint },
  loading: { alignSelf: 'center', marginVertical: 24 },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: 40, paddingHorizontal: 40, borderRadius: radius.card, backgroundColor: colors.surface },
  emptyText: { fontSize: text.body, color: colors.sub, textAlign: 'center' },
})
