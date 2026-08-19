import { Ionicons } from '@expo/vector-icons'
import { Image, StyleSheet, Text, View } from 'react-native'
import type { Paper } from '@/api/types'
import { paperOf } from '@/lib/paper'
import { colors, radius, text } from '@/theme'

export type DayState = 'photo' | 'note' | 'empty' | 'today' | 'future' | 'locked'

interface Props {
  day: number
  state: DayState
  /** 0=일 … 6=토. 주말만 색이 붙는다 */
  weekday: number
  /**
   * 줄 사이에 더 줄 여백. **칸은 늘 정사각이다** —
   * 폭이 7칸으로 고정이라 칸을 키우면 높이만 늘어나 사진이 길쭉해 보인다.
   * 남는 높이는 칸이 아니라 **틈**이 먹는다
   */
  rowPad?: number
  photo?: string
  note?: string
  /** 글만 남긴 날의 종이 색 — 사진이 없어도 칸마다 다른 색이 서게 한다 */
  paper?: Paper
  /** 내 '나만 보기' 날 — 내용은 그대로 보이고 모서리에 자물쇠만 붙는다 */
  onlyMe?: boolean
  /** 히어로가 출발할 사각형 — 타일이 아니라 **사진**을 재야 어긋나지 않는다 */
  tileRef?: (v: View | null) => void
}

/**
 * 달력 한 칸.
 *
 * 사진이 타일을 꽉 채우지 않는다 — **옅은 타일 위에 사진이 얹혀 있다.**
 * 사방에 타일이 비쳐 보여야 격자가 판판한 모자이크가 아니라 물건을 늘어놓은 판으로 읽힌다.
 *
 * 기록이 있으면 날짜는 안 쓴다 — 사진이 이미 그날을 말한다. 비워둔 날에만 숫자가 나온다.
 * **아직 안 온 날도 면을 깐다** — 한 달을 통째로 보려면 격자가 끝까지 이어져야 한다.
 * 대신 숫자를 옅게 눌러 지나온 날과 구분한다(지나온 빈 날은 눌러서 채울 수 있고, 앞날은 아니다).
 *
 * `locked` 는 **남긴 건 아는데 나에게는 안 열리는 날**이다. 빈 날처럼 보이면 안 된다 —
 * 비어 있는 것과 잠긴 것은 전혀 다른 사실이고, 그 차이가 다음 날 한 장을 남기게 만든다.
 */
export default function DayCell({ day, state, weekday, rowPad = 0, photo, note, paper, onlyMe, tileRef }: Props) {
  const pp = paperOf(paper)
  const ahead = state === 'future'
  // 오늘 표시가 주말 색보다 앞선다 — 한 칸만 색을 갖는 게 격자에서 더 급한 정보다
  const numColor =
    state === 'today' ? colors.accent
      : weekday === 0 ? colors.sun
        : weekday === 6 ? colors.sat
          : ahead ? colors.faint : colors.sub

  return (
    <View style={[styles.cell, rowPad > 0 && { paddingVertical: 3 + rowPad }]}>
      <View style={[styles.slot, ahead && styles.ahead]}>
        {state === 'photo' && (
          <View ref={tileRef} collapsable={false} style={styles.object}>
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          </View>
        )}
        {state === 'note' && (
          <View ref={tileRef} collapsable={false} style={[styles.object, styles.paper, { backgroundColor: pp.bg }]}>
            <Text style={[styles.noteText, { color: pp.ink }]} numberOfLines={3}>{note}</Text>
          </View>
        )}
        {/* 잠긴 날 — 자물쇠 하나뿐이다. 사진도 글도 애초에 여기까지 오지 않는다 */}
        {state === 'locked' && (
          <View style={[styles.object, styles.vault]}>
            <Ionicons name="lock-closed" size={13} color={colors.sub} />
          </View>
        )}
        {/* 기록이 없는 날만 숫자를 쓴다 */}
        {(state === 'empty' || state === 'today' || ahead) && (
          <Text style={[styles.num, { color: numColor }, state === 'today' && styles.numToday, ahead && styles.numAhead]}>
            {day}
          </Text>
        )}
        {/* 내 나만 보기 — 물건 위 오른쪽 아래에 얹는다. 내용을 가리지 않는 자리 */}
        {onlyMe && (state === 'photo' || state === 'note') && (
          <View style={styles.seal}>
            <Ionicons name="lock-closed" size={8} color="#fff" />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  cell: { flex: 1, padding: 3 },
  slot: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.tile,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 아직 안 온 날 — 면은 깔되 한 겹 물러난다 */
  ahead: { backgroundColor: colors.bg },
  /** 타일 위에 놓인 물건. 그림자는 있는 줄도 모를 만큼만 — 진하면 스티커처럼 뜬다 */
  object: {
    position: 'absolute',
    left: '12%', right: '12%', top: '12%', bottom: '12%',
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    shadowColor: '#111418',
    shadowOpacity: 0.07,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  photo: { width: '100%', height: '100%', borderRadius: radius.chip },
  // 색은 그날 고른 종이에서 온다. 자리는 상세와 같게 왼쪽 위부터
  paper: { padding: 4 },
  noteText: { fontSize: 9, lineHeight: 11 },

  /** 잠긴 칸 — 물건이 아니라 닫힌 면이다. 그림자를 지워 얹힌 느낌을 없앤다 */
  vault: {
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  /** 내 나만 보기 도장 — 사진 위에서도 읽히게 짙은 면에 흰 자물쇠 */
  seal: {
    position: 'absolute',
    right: '15%',
    bottom: '15%',
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(25,29,36,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  num: { fontSize: text.caption, fontWeight: '600' },
  numToday: { fontWeight: '800' },
  numAhead: { opacity: 0.6 },
})
