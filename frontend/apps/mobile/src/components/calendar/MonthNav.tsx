import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, space, text } from '@/theme'

interface Ym {
  year: number
  month: number
}

interface Props {
  ym: Ym
  onChange: (next: Ym) => void
  /** 이번 달. 앞으로 올 달은 기록도 없고 남길 수도 없어 앞으로 못 간다 */
  now: Ym
}

/** 달 넘기기 — 열두 달을 넘어가면 해가 바뀐다 */
const shift = (ym: Ym, delta: number): Ym => {
  const m = ym.month + delta
  if (m < 0) return { year: ym.year - 1, month: 11 }
  if (m > 11) return { year: ym.year + 1, month: 0 }
  return { year: ym.year, month: m }
}

/**
 * 달력 위의 달 머리글 — 큰 `N월` 과 `‹ 년·월 ›`.
 *
 * 내 프로필과 남의 프로필이 **같은 것을 쓴다.** 같은 markup 을 두 벌 두면
 * 한쪽만 고쳐져 두 화면이 조금씩 어긋난다.
 */
export default function MonthNav({ ym, onChange, now }: Props) {
  const atNow = ym.year === now.year && ym.month === now.month

  const go = (delta: number) => {
    Haptics.selectionAsync().catch(() => undefined)
    onChange(shift(ym, delta))
  }

  return (
    <View style={styles.head}>
      <Text style={styles.month}>{ym.month + 1}월</Text>
      <View style={styles.pager}>
        <Pressable style={styles.step} onPress={() => go(-1)} hitSlop={6} accessibilityLabel="지난 달">
          <Ionicons name="chevron-back" size={16} color={colors.sub} />
        </Pressable>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{ym.year}년 {ym.month + 1}월</Text>
        </View>
        <Pressable style={styles.step} onPress={() => go(1)} hitSlop={6} disabled={atNow} accessibilityLabel="다음 달">
          <Ionicons name="chevron-forward" size={16} color={atNow ? colors.line : colors.sub} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 16 },
  month: { flex: 1, fontSize: text.display, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 13, height: 30, borderRadius: radius.pill, backgroundColor: colors.surface, justifyContent: 'center' },
  pillText: { fontSize: text.small, fontWeight: '600', color: colors.ink },
})
