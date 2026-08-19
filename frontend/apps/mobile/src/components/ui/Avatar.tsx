import { LinearGradient } from 'expo-linear-gradient'
import { Image, StyleSheet, Text, View } from 'react-native'
import { radius } from '@/theme'

interface Props {
  name: string
  /** 프로필 사진. 없으면 이니셜로 떨어진다 */
  uri?: string
  /** 서버가 주는 사람별 색. 그대로 칠하지 않고 색상(hue)만 가져다 쓴다 */
  color: string
  size?: number
}

/** `#rrggbb` → `[색상 0~360, 채도 0~1]` */
function hue(hex: string): [number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s]
}

/**
 * 이니셜 아바타.
 *
 * 진한 원 + 흰 글씨는 오래돼 보이고, 파스텔 평면 틴트도 이제는 2020년 문법이다.
 * 얼굴이 열 개 넘게 한 줄에 서면 그 색들이 그대로 화면의 소음이 된다.
 *
 * 그래서 두 가지를 지킨다 —
 * **채도를 거의 바닥까지 내리고**(사람 구분은 색이 아니라 글자가 한다),
 * 평면 대신 **아주 얕은 세로 그라디언트**를 준다. 색이 아니라 빛으로 입체를 만든다.
 * 화면의 진짜 색은 사진에서 나온다.
 */
export default function Avatar({ name, uri, color, size = 36 }: Props) {
  const initial = name.trim().charAt(0) || '·'
  const [h, s] = hue(color)
  // 10~22% — 회색에 가깝지만 사람마다 미묘하게 다르다. 열 개가 늘어서도 안 시끄럽다
  const sat = Math.min(22, Math.max(10, Math.round((s + 0.1) * 40)))
  const hsl = (sl: number, l: number) => `hsl(${Math.round(h)}, ${sl}%, ${l}%)`

  return (
    <View style={[styles.face, { width: size, height: size, borderRadius: radius.pill }]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <LinearGradient colors={[hsl(sat, 96), hsl(sat + 4, 89)]} style={StyleSheet.absoluteFill} />
          <Text style={[styles.initial, { fontSize: Math.round(size * 0.38), color: hsl(sat + 6, 38) }]}>
            {initial}
          </Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // 700 은 원 안에서 뭉쳐 보이고, 600 은 낮은 채도에서 너무 무겁다
  initial: { fontWeight: '500', letterSpacing: 0.2 },
})
