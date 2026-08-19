import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useMemo, useRef, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { qk } from '@/api/keys'
import { getAllEntries, getEntry, getMe, getMonthEntries, toggleLike } from '@/api/dayed'
import type { Entry, FeedItem } from '@/api/types'
import MonthCard, { type DayEntryLite } from '@/components/calendar/MonthCard'
import MonthNav from '@/components/calendar/MonthNav'
import TodayBlock from '@/components/today/TodayBlock'
import EntryActions from '@/components/feed/EntryActions'
import PostDetail, { splitTimeline, type DayItem, type Rect } from '@/components/feed/PostDetail'
import Avatar from '@/components/ui/Avatar'
import { useComposer } from '@/contexts/ComposerContext'
import { dayLabel, parseKey, todayKey, type DateKey } from '@/lib/date'
import { patchEntry, toggleLikeOn } from '@/lib/entryCache'
import { toFeedItem } from '@/lib/feedItem'
import { usePullRefresh } from '@/lib/usePullRefresh'
import { colors, radius, space, text } from '@/theme'

/**
 * `나` — **이 앱의 뿌리 화면.**
 *
 * 홈이 따로 있었는데 없앴다. 빈 칸과 친구 목록 미리보기뿐이라 껍데기였고,
 * 오늘 쓰기는 달력의 오늘 칸으로 **이미 되고 있었다**(`onPressDay`) — 안 보였을 뿐이다.
 *
 * 위에서 아래로 **시간 순서**다: 나 → 오늘 → 지나온 날 → 친구 → 설정.
 * 작성 줄이 달력 **위**에 있는 이유 — 아래에 두면 설정 묶음과 붙어 설정 항목처럼 읽힌다.
 *
 * **남의 프로필과 같은 구조**다 — 얼굴 · 통계 · 달력.
 * 화면마다 내 기록을 다른 모양으로 늘어놓으면 같은 것을 세 번 배우게 된다.
 */
export default function ProfileScreen() {
  const navigation = useNavigation<any>()
  const queryClient = useQueryClient()
  const composer = useComposer()
  const today = todayKey()
  const now = parseKey(today)

  const meQ = useQuery({ queryKey: qk.me, queryFn: getMe })

  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const monthQ = useQuery({ queryKey: qk.month(ym.year, ym.month), queryFn: () => getMonthEntries(ym.year, ym.month) })

  /**
   * 오늘은 **달과 따로** 부른다 — 달력이 지난 달을 보고 있어도 오늘 기록을 시트에서 찾아야 한다.
   * 홈이 채워둔 캐시와 같은 키라 대개 곧바로 뜬다.
   */
  const todayQ = useQuery({ queryKey: qk.entry(today), queryFn: () => getEntry(today) })

  const me = meQ.data
  const { refreshing, onRefresh } = usePullRefresh(() =>
    // 통계는 이 화면에 안 나오지만 탭 배지가 쓴다 → 당겨서 새로고침하면 같이 턴다
    Promise.all([meQ.refetch(), monthQ.refetch(), todayQ.refetch(),
      queryClient.invalidateQueries({ queryKey: qk.stats })]))

  const entriesByDate = new Map((monthQ.data ?? []).map((e) => [e.dateKey, e]))
  const cells = new Map<DateKey, DayEntryLite>(
    (monthQ.data ?? []).map((e) => [
      e.dateKey,
      { photo: e.photos[0], thumb: e.thumb, note: e.text, paper: e.paper, onlyMe: e.visibility === 'private' },
    ]),
  )

  /** 상세는 화면이 아니라 이 화면 위에 덮는 오버레이 — 칸에서 출발한 좌표가 맞아야 한다 */
  const [opened, setOpened] = useState<{ item: FeedItem; dateKey: DateKey; from: Rect } | null>(null)
  const [sheetFor, setSheetFor] = useState<DateKey | null>(null)
  const tiles = useRef<Record<string, View | null>>({})
  /** 기록 하나를 상세로 연다 */
  const openEntry = (entry: Entry, node: View | null) => {
    const item = toFeedItem(entry, me)
    const k = entry.dateKey
    if (node) node.measureInWindow((x, y, w, h) => setOpened({ item, dateKey: k, from: { x, y, w, h } }))
    else setOpened({ item, dateKey: k, from: { x: 0, y: 0, w: 0, h: 0 } })
  }

  /**
   * 빈 날을 누르면 **곧장 쓰는 화면**으로 간다.
   * 사진이냐 글이냐를 미리 묻지 않는다 — 쓰다가 사진을 붙이면 사진이 있는 날이다.
   * 예전엔 사진첩부터 떠서, 글만 남기려면 그걸 닫아야 종이가 나왔다.
   */
  const onPressDay = (k: DateKey) => {
    const entry = entriesByDate.get(k)
    if (entry) openEntry(entry, tiles.current[k])
    else if (k <= today) composer.open({ dateKey: k })
  }

  // 상세는 누른 날에 서 있는 타임라인이다. 열기 전에는 전체를 안 부른다
  const allQ = useQuery({ queryKey: qk.allEntries, queryFn: getAllEntries, enabled: opened !== null })
  const timeline = allQ.data ?? monthQ.data ?? []
  /** 홈과 같은 하트 — 내 기록에도 내가 누른다 */
  const like = useMutation({
    mutationFn: (k: DateKey) => toggleLike(`me-${k}`),
    onMutate: (k) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
      patchEntry(queryClient, k, toggleLikeOn)
    },
    onError: () => queryClient.invalidateQueries(),
  })

  const asDay = (e: Entry): DayItem => ({
    dateKey: e.dateKey,
    item: toFeedItem(e, me),
    dateLabel: dayLabel(e.dateKey),
    onMore: () => setSheetFor(e.dateKey),
    onToggleLike: () => like.mutate(e.dateKey),
  })
  const { earlier, later } = useMemo(
    () => splitTimeline(opened ? timeline.map(asDay) : [], opened?.dateKey ?? ''),
    [opened, timeline, me],
  )

  // 열어둔 상세는 캐시의 지금 상태를 본다 — 사본을 넘기면 공개 범위·하트가 안 따라온다
  const liveEntry = opened
    ? timeline.find((e) => e.dateKey === opened.dateKey) ?? entriesByDate.get(opened.dateKey)
    : undefined
  const detailItem = liveEntry ? toFeedItem(liveEntry, me) : opened?.item

  /** 달력이 다른 달을 보고 있어도 오늘 것은 시트에서 찾을 수 있어야 한다 */
  const todayEntry = todayQ.data ?? null
  const todayItem = todayEntry ? toFeedItem(todayEntry, me) : null
  /** 오늘 칸은 달력 밖에 따로 서 있어서 히어로가 출발할 사각형을 따로 잰다 */
  const topFrame = useRef<View>(null)

  /* 달력이 화면에서 남는 높이를 먹는다 — 보이는 만큼과 그 위에 놓인 것의 키를 잰다 */
  const [viewH, setViewH] = useState(0)
  const [aboveH, setAboveH] = useState(0)

  const sheetEntry = sheetFor
    ? timeline.find((e) => e.dateKey === sheetFor) ?? entriesByDate.get(sheetFor) ?? todayEntry
    : null

  // 아래 안전영역은 탭 바가 진다 — 여기서 또 주면 두 번 벌어진다
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/*
        **한 줄짜리 머리글.** 예전엔 얼굴 72 에 이름·아이디·통계 상자까지 얹은 카드였는데
        230pt 를 먹으면서 달력을 화면 밖으로 밀어냈다 — 게다가 전부 내가 이미 아는 정보다.
        남의 프로필은 카드 그대로다. 거기선 처음 보는 사람이라 얼굴과 통계가 실제로 필요하다
      */}
      <View style={styles.head}>
        <Avatar name={me?.name ?? ''} uri={me?.avatar} color={me?.color ?? colors.accent} size={36} />
        <View style={styles.headWho}>
          <Text style={styles.headName} numberOfLines={1}>{me?.name ?? '나'}</Text>
          <Text style={styles.headHandle} numberOfLines={1}>@{me?.handle ?? ''}</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          hitSlop={10}
          accessibilityLabel="설정"
        >
          <Ionicons name="settings-outline" size={22} color={colors.sub} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        // 달력이 남는 높이를 먹으려면 보이는 만큼과 그 위에 놓인 것을 알아야 한다
        onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/*
          한 자리가 상태에 따라 둘로 갈린다 — **안 담았으면 쓰러 가는 줄, 담았으면 담은 것.**

          담은 것을 크게 보여주는 이유는 **받은 반응** 때문이다. 달력의 47pt 칸에는
          하트도 댓글도 안 들어가는데, 그게 이 앱을 다시 여는 이유다.
          달력에도 오늘 칸이 있어 한 하루가 화면에 두 번 나오지만,
          크게 볼 자리가 아예 없는 것보다는 낫다고 봤다
        */}
        <View onLayout={(e) => setAboveH(e.nativeEvent.layout.height)}>
          {todayItem === null ? (
            /*
              큰 칸에 알약을 얹으면 배너 광고의 짜임이 된다. 얇은 줄에 컴포저와 **같은 문장**을
              넣으면 입력칸으로 읽히고, 누르면 실제로 그 문장이 있는 화면이 키보드와 함께 열린다
            */
            <Pressable
              style={({ pressed }) => [styles.write, pressed && styles.writePressed]}
              onPress={() => composer.open({ dateKey: today })}
              accessibilityLabel="오늘 남기기"
            >
              <Text style={styles.writeText}>오늘은 어떤 일이 있었나요?</Text>
              <View style={styles.writePlus}>
                <Ionicons name="add" size={18} color="#fff" />
              </View>
            </Pressable>
          ) : (
            <View style={styles.todayWrap}>
              <TodayBlock
                item={todayItem}
                frameRef={(v) => { topFrame.current = v }}
                onPress={() => todayEntry && openEntry(todayEntry, topFrame.current)}
                onToggleLike={() => like.mutate(today)}
                onMore={() => setSheetFor(today)}
              />
            </View>
          )}

          {/* 남의 프로필과 같은 자리에 같은 달력 */}
          <MonthNav ym={ym} onChange={setYm} now={{ year: now.getFullYear(), month: now.getMonth() }} />
        </View>
        <MonthCard
          year={ym.year}
          month={ym.month}
          entries={cells}
          today={today}
          onPressDay={onPressDay}
          tileRef={(k, v) => { tiles.current[k] = v }}
          writable
          availableHeight={viewH > 0 && aboveH > 0 ? viewH - aboveH : undefined}
        />

      </ScrollView>

      {opened && detailItem && (
        <PostDetail
          item={detailItem}
          dateLabel={dayLabel(opened.dateKey)}
          from={opened.from}
          earlier={earlier}
          later={later}
          onClose={() => setOpened(null)}
          onToggleLike={() => like.mutate(opened.dateKey)}
          onMore={() => setSheetFor(opened.dateKey)}
          onCommentsChanged={() => queryClient.invalidateQueries()}
        />
      )}

      {/*
        상세를 열면 지난 하루의 `⋯` 도 이 시트를 연다 → 이번 달만 보면 지난 달의 체크가 틀린다.
        타임라인에서 먼저 찾고, 없으면 이번 달 목록으로 떨어진다
      */}
      <EntryActions
        dateKey={sheetFor}
        visibility={sheetEntry?.visibility}
        onClose={() => setSheetFor(null)}
        onDeleted={() => setOpened(null)}
      />

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 16, paddingBottom: 40 },
  // 오늘 담은 것과 달 머리글 사이 — 머리글이 제 위 여백을 가져서 아래만 준다
  todayWrap: { paddingTop: space.lg },

  head: {
    height: 52, flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: 16,
  },
  headWho: { flex: 1, gap: 1 },
  headName: { fontSize: text.lead, fontWeight: '700', color: colors.ink },
  headHandle: { fontSize: text.caption, color: colors.sub },

  /* 오늘 안 담았을 때만 나오는 줄. 입력칸처럼 생겨야 눌러서 쓰는 자리로 읽힌다 */
  write: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    height: 52, paddingLeft: 18, paddingRight: 13, marginTop: space.lg,
    borderRadius: radius.card, backgroundColor: colors.surface,
  },
  writePressed: { opacity: 0.7 },
  writeText: { flex: 1, fontSize: text.lead, color: colors.faint },
  writePlus: {
    width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },



})
