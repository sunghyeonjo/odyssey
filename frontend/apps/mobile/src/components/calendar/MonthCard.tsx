import { useState } from 'react'
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import type { Paper } from '@/api/types'
import DayCell, { type DayState } from '@/components/calendar/DayCell'
import { WEEK, monthGrid, parseKey, type DateKey } from '@/lib/date'
import { colors, radius, space, text } from '@/theme'

/** 달력이 한 칸을 그리는 데 필요한 전부. `Entry` 통째로 넘기면 남의 기록에는 안 맞는다 */
export interface DayEntryLite {
  photo?: string
  /** 칸은 44pt 남짓이다 — 있으면 이걸 쓴다 */
  thumb?: string
  note?: string
  /** 사진 없이 글만 남긴 날의 종이 색. 없으면 기본 종이 */
  paper?: Paper
  /** 내 '나만 보기' 날 — 내용은 그대로, 모서리에 자물쇠 도장 */
  onlyMe?: boolean
  /** 남겼지만 나에게는 안 열린 날 — 내용이 애초에 없다. 자물쇠 칸으로만 앉는다 */
  locked?: boolean
}

interface Props {
  year: number
  month: number
  entries: Map<DateKey, DayEntryLite>
  today: DateKey
  onPressDay: (k: DateKey) => void
  tileRef?: (k: DateKey, v: View | null) => void
  /**
   * 빈 칸을 눌러 남길 수 있는지 — **내 달력에서만** 참.
   * 남의 달력에서는 빈 날에 누를 것이 없다.
   *
   * 오늘뿐 아니라 **지나간 빈 날도** 열린다. 실수로 안 남긴 날을 뒤늦게 채울 수 있어야 한다.
   * 아직 안 온 날은 여기서도 안 열린다
   */
  writable?: boolean
  /**
   * 격자가 채울 수 있는 높이. 주면 남는 만큼 **줄 사이를 벌린다.**
   *
   * 칸을 키우지는 않는다 — 폭이 7칸으로 고정이라 키우면 높이만 늘어나
   * 사진이 길쭉해 보인다. 한 번 그렇게 해봤다가 되돌렸다.
   */
  availableHeight?: number
}

/** 카드 안쪽 위아래 여백 — 남는 높이를 잴 때 빼야 한다 */
const CARD_PAD = space.lg + space.md
/** 줄 사이를 이보다 더 벌리면 격자가 아니라 흩어진 점이 된다 */
const MAX_ROW_PAD = 7

/**
 * 흰 카드 안의 한 달 격자. 홈 · 나 · 남의 프로필이 같은 것을 쓴다.
 *
 * 좌우로 밀어 달을 넘기는 제스처는 뺐다 — 손가락을 따라 카드가 밀리는 게 눈에 거슬리고,
 * 세로 스크롤 안에 든 카드에서 가로 끌기는 스크롤과 싸운다.
 * 달을 옮기는 손잡이(`‹ ›`)는 바로 위에 늘 보인다.
 */
export default function MonthCard({
  year, month, entries, today, onPressDay, tileRef, writable = false, availableHeight,
}: Props) {
  const cells = monthGrid(year, month)
  const weeks: (DateKey | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  /* 요일줄 키는 글꼴에 따라 달라진다 → 재서 쓴다. 상수로 박으면 기기마다 어긋난다 */
  const [headH, setHeadH] = useState(0)
  const [cardW, setCardW] = useState(0)
  const onCard = (e: LayoutChangeEvent) => setCardW(e.nativeEvent.layout.width)

  /** 줄 사이에 더 줄 여백 — 칸은 정사각 그대로 두고 틈만 벌린다 */
  const rowPad = (() => {
    if (!cardW || !availableHeight || !headH) return 0
    const square = (cardW - space.md * 2) / 7
    const fit = (availableHeight - CARD_PAD - headH) / weeks.length
    return Math.min(Math.max((fit - square) / 2, 0), MAX_ROW_PAD)
  })()

  const stateOf = (k: DateKey): DayState => {
    const e = entries.get(k)
    if (e?.locked) return 'locked'
    if (e) return e.photo ? 'photo' : 'note'
    if (k > today) return 'future'
    return k === today ? 'today' : 'empty'
  }

  return (
    <View style={styles.card} onLayout={onCard}>
      <View style={styles.weekRow} onLayout={(e) => setHeadH(e.nativeEvent.layout.height)}>
        {WEEK.map((w, i) => (
          <View key={w} style={styles.headCell}>
            <Text style={[
              styles.weekLabel,
              i === 0 && { color: colors.sun },
              i === 6 && { color: colors.sat },
            ]}>
              {w}
            </Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((k, di) => {
            if (!k) return <View key={`e${di}`} style={styles.slot} />
            const e = entries.get(k)
            return (
              <Pressable
                key={k}
                style={styles.slot}
                /*
                  눌러도 아무 일 없는 자리는 안 눌리게 둔다 —
                  잠긴 날(열 것이 없다) · 아직 안 온 날 · 남의 달력의 빈 날
                */
                disabled={!!e?.locked || (!e && !(writable && k <= today))}
                onPress={() => onPressDay(k)}
              >
                <DayCell
                  day={parseKey(k).getDate()}
                  state={stateOf(k)}
                  weekday={di}
                  rowPad={rowPad}
                  photo={e?.thumb ?? e?.photo}
                  note={e?.note}
                  paper={e?.paper}
                  onlyMe={e?.onlyMe}
                  tileRef={tileRef && ((v) => tileRef(k, v))}
                />
              </Pressable>
            )
          })}
          {/* 마지막 주가 비면 칸을 채워 요일 정렬 유지 */}
          {week.length < 7 &&
            Array.from({ length: 7 - week.length }).map((_, i) => <View key={`p${i}`} style={styles.slot} />)}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  // 크림 바탕 위의 흰 카드. 선 대신 면으로 층을 가른다
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.md, paddingTop: space.lg },
  weekRow: { flexDirection: 'row' },
  headCell: { flex: 1, alignItems: 'center', paddingBottom: 8 },
  weekLabel: { fontSize: text.caption, fontWeight: '600', color: colors.faint },
  slot: { flex: 1 },
})
