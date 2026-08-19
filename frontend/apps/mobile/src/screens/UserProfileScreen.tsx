import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { qk } from '@/api/keys'
import { getProfile, markOpened, toggleLike } from '@/api/dayed'
import type { FeedItem, Profile } from '@/api/types'
import MonthCard, { type DayEntryLite } from '@/components/calendar/MonthCard'
import MonthNav from '@/components/calendar/MonthNav'
import PostDetail, { splitTimeline, type DayItem, type Rect } from '@/components/feed/PostDetail'
import FriendButton from '@/components/friend/FriendButton'
import SafetyActions, { type SafetyTarget } from '@/components/safety/SafetyActions'
import TodayBlock from '@/components/today/TodayBlock'
import Avatar from '@/components/ui/Avatar'
import { dateOfItem } from '@/lib/feedItem'
import { dayLabel, parseKey, todayKey, type DateKey } from '@/lib/date'
import { usePullRefresh } from '@/lib/usePullRefresh'
import { colors, radius, space, text } from '@/theme'

interface Opened {
  item: FeedItem
  from: Rect
}

/**
 * 남의 프로필 — 얼굴 · 통계, 그리고 홈과 같은 달력.
 *
 * 친구가 아니면 기록은 한 장도 오지 않는다 — 가리는 게 아니라 서버가 안 보낸다.
 * 대신 이름 · 기록 수는 보여준다. 친구를 맺을지 정하려면 그 정도는 필요하다.
 */
export default function UserProfileScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const queryClient = useQueryClient()
  const { userId } = route.params as { userId: number }
  const today = todayKey()
  const now = parseKey(today)

  const [opened, setOpened] = useState<Opened | null>(null)
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const key = qk.profile(userId)
  const profileQ = useQuery({ queryKey: key, queryFn: () => getProfile(userId) })
  const p = profileQ.data
  const pull = usePullRefresh(() => profileQ.refetch())

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !opened })
  }, [navigation, opened])

  const like = useMutation({
    mutationFn: (itemId: string) => toggleLike(itemId),
    onMutate: (itemId) =>
      queryClient.setQueryData<Profile>(key, (prev) =>
        prev
          ? {
              ...prev,
              entries: prev.entries.map((e) =>
                e.id === itemId
                  ? { ...e, likedByMe: !e.likedByMe, likeCount: e.likeCount + (e.likedByMe ? -1 : 1) }
                  : e,
              ),
            }
          : prev,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  /**
   * 안 읽음 표시는 되돌릴 일이 없다 → 캐시를 먼저 지우고 서버엔 알리기만.
   * 이 화면이 남의 기록을 여는 유일한 길이라 여기서 안 부르면 영영 안 꺼진다.
   */
  const open = useMutation({
    mutationFn: (itemId: string) => markOpened(itemId),
    onMutate: (itemId) =>
      queryClient.setQueryData<Profile>(key, (prev) =>
        prev
          ? { ...prev, entries: prev.entries.map((e) => (e.id === itemId ? { ...e, openedByMe: true } : e)) }
          : prev,
      ),
  })

  /** 날짜 → 그 사람 기록. 달력과 상세가 같은 지도를 본다 */
  const byDate = useMemo(() => {
    const m = new Map<DateKey, FeedItem>()
    for (const it of p?.entries ?? []) m.set(dateOfItem(it.id), it)
    return m
  }, [p])

  /**
   * 잠긴 날도 달력에 앉는다 — 내용은 안 오지만 **비어 있지 않다는 것**은 온다.
   * 빈 칸으로 두면 안 남긴 날과 구분이 안 되고, 그 차이가 이 앱에서 제일 궁금한 것이다
   */
  const cells = useMemo(() => {
    const m = new Map<DateKey, DayEntryLite>()
    byDate.forEach((it, k) => m.set(k, { photo: it.photos[0], thumb: it.thumb, note: it.text, paper: it.paper }))
    for (const k of p?.lockedDates ?? []) m.set(k, { locked: true })
    return m
  }, [byDate, p])

  // 잠긴 날도 그 사람이 남긴 날이다 — 위의 `기록` 수와 같은 셈법을 쓴다
  const monthCount = useMemo(() => {
    const prefix = `${ym.year}-${String(ym.month + 1).padStart(2, '0')}`
    return [...cells.keys()].filter((k) => k.startsWith(prefix)).length
  }, [cells, ym])

  /** 오늘 남긴 것 — 달력 위에 크게 올린다. 홈에서 내 오늘을 보는 것과 같은 모양이다 */
  const todayItem = byDate.get(today) ?? null

  const tiles = useRef<Record<string, View | null>>({})
  /** 위의 오늘 칸은 달력 칸과 다른 자리라 히어로가 출발할 사각형을 따로 잰다 */
  const topFrame = useRef<View>(null)

  const openItem = (item: FeedItem, node: View | null) => {
    const go = (from: Rect) => {
      setOpened({ item, from })
      if (!item.openedByMe) open.mutate(item.id)
    }
    if (node) node.measureInWindow((x, y, w, h) => go({ x, y, w, h }))
    else go({ x: 0, y: 0, w: 0, h: 0 })
  }

  /** 신고·차단 손잡이를 연 대상 — 프로필 전체이거나 기록 한 건 */
  const [safetyFor, setSafetyFor] = useState<SafetyTarget | null>(null)

  const onPressDay = (k: DateKey) => {
    const item = byDate.get(k)
    if (item) openItem(item, tiles.current[k])
  }

  // API 는 최신순으로 준다. 이 앱은 어디서나 위가 과거라 뒤집어 쓴다
  const entries = useMemo(() => [...(p?.entries ?? [])].reverse(), [p])
  const detailItem = opened && (entries.find((e) => e.id === opened.item.id) ?? opened.item)

  const { earlier, later } = splitTimeline(
    entries.map((it): DayItem => ({
      dateKey: dateOfItem(it.id),
      item: it,
      dateLabel: dayLabel(dateOfItem(it.id)),
      onToggleLike: () => like.mutate(it.id),
      // 남의 기록에는 고칠 것이 없다. 대신 신고·차단이 온다
      onMore: () => setSafetyFor({ kind: 'entry', itemId: it.id, userId: p!.id, name: p!.name }),
    })),
    opened ? dateOfItem(opened.item.id) : '',
  )

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {profileQ.isPending ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : !p ? (
        <View style={styles.center}><Text style={styles.emptyText}>찾을 수 없는 사람이에요</Text></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl {...pull} tintColor={colors.accent} />}
        >
          {/* 뒤로 가기와 친구·신고 손잡이는 카드 밖 얇은 막대에 */}
          <View style={styles.nav}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color={colors.ink} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <FriendButton user={p} />
            <Pressable
              style={styles.more}
              onPress={() => setSafetyFor({ kind: 'user', userId: p.id, name: p.name })}
              hitSlop={10}
              accessibilityLabel={`${p.name}님 신고하거나 차단하기`}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.sub} />
            </Pressable>
          </View>

          <View style={styles.card}>
            <Avatar name={p.name} uri={p.avatar} color={p.color} size={72} />
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.handle}>@{p.handle}</Text>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{p.entryCount}</Text>
                <Text style={styles.statLabel}>기록</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{monthCount}</Text>
                <Text style={styles.statLabel}>이번 달</Text>
              </View>
            </View>
          </View>

          {p.friendState === 'friends' ? (
            <>
              {/* 오늘 남겼으면 그것부터 — 지나온 날은 그 아래 달력이 말한다 */}
              {todayItem && (
                <View style={styles.todayWrap}>
                  <TodayBlock
                    item={todayItem}
                    lead="오늘"
                    frameRef={(v) => { topFrame.current = v }}
                    onPress={() => openItem(todayItem, topFrame.current)}
                    onToggleLike={() => like.mutate(todayItem.id)}
                    onMore={() => setSafetyFor({ kind: 'entry', itemId: todayItem.id, userId: p.id, name: p.name })}
                  />
                </View>
              )}

              <MonthNav ym={ym} onChange={setYm} now={{ year: now.getFullYear(), month: now.getMonth() }} />
              <MonthCard
                year={ym.year}
                month={ym.month}
                entries={cells}
                today={today}
                onPressDay={onPressDay}
                tileRef={(k, v) => { tiles.current[k] = v }}
              />
            </>
          ) : (
            <View style={styles.sealed}>
              <Ionicons name="lock-closed-outline" size={26} color={colors.faint} />
              <Text style={styles.sealedTitle}>친구가 되면 볼 수 있어요</Text>
              <Text style={styles.sealedSub}>
                {p.friendState === 'requested'
                  ? `${p.name}님이 수락하면 서로의 하루가 보여요`
                  : p.friendState === 'incoming'
                    ? `${p.name}님이 친구 요청을 보냈어요`
                    : '친구를 맺으면 서로의 하루를 볼 수 있어요'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {opened && detailItem && (
        <PostDetail
          item={detailItem}
          dateLabel={dayLabel(dateOfItem(detailItem.id))}
          from={opened.from}
          earlier={earlier}
          later={later}
          onClose={() => setOpened(null)}
          onToggleLike={() => like.mutate(detailItem.id)}
          onCommentsChanged={() => queryClient.invalidateQueries({ queryKey: key })}
        />
      )}
      <SafetyActions
        target={safetyFor}
        onClose={() => setSafetyFor(null)}
        // 차단하면 그 사람 화면에 머무를 이유가 없다 — 기록도 이름도 더 안 보인다
        onBlocked={() => { setSafetyFor(null); setOpened(null); navigation.goBack() }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 40 },

  nav: { height: 44, flexDirection: 'row', alignItems: 'center' },
  more: { marginLeft: space.md },

  // 세로 간격은 이 `gap` 하나 (PostCard 와 같은 방식)
  card: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    padding: space.lg, gap: space.sm, alignItems: 'center',
  },
  name: { fontSize: text.display, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  handle: { fontSize: text.body, color: colors.sub },

  // 통계는 회색 라운드 박스 안에 — 카드 안의 카드
  stats: { alignSelf: 'stretch', flexDirection: 'row', marginTop: space.sm, borderRadius: radius.card, backgroundColor: colors.tile, paddingVertical: space.lg },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: text.title, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: text.caption, color: colors.sub },

  todayWrap: { paddingTop: space.xl },

  sealed: { alignItems: 'center', gap: space.sm, marginTop: space.lg, paddingVertical: 48, paddingHorizontal: 30, borderRadius: radius.card, backgroundColor: colors.surface },
  sealedTitle: { fontSize: text.lead, fontWeight: '700', color: colors.ink },
  sealedSub: { fontSize: text.small, color: colors.sub, textAlign: 'center' },
  emptyText: { fontSize: text.body, color: colors.sub },
})
