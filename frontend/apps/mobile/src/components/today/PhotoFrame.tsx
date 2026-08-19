import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Paper } from '@/api/types'
import { NOTE_FONT, paperOf } from '@/lib/paper'
import { colors, radius } from '@/theme'

/**
 * 홈 칸의 비율 — **빈 칸(`ShotFrame`)과 같은 `3:2`.**
 * 남기기 전과 뒤가 같은 자리 같은 크기라 화면이 안 흔들린다.
 *
 * 여기는 사진 비율(`PHOTO_RATIO`)을 따르지 않는다. 따르면 폭을 다 쓰는 세로 사진이 되어
 * 화면의 절반을 먹는다 — 칸은 **사진을 보는 자리가 아니라 알아보는 자리**다.
 * **보는 자리는 안 자르고, 알아보는 자리는 잘라도 된다** — 컴포저·상세는 사진 비율 그대로,
 * 홈 칸과 달력 칸은 제 비율의 상자에 담는다.
 */
const TILE_RATIO = 3 / 2

interface Props {
  photo?: string
  /** 사진이 없으면 종이에 이 글이 적힌다 */
  note?: string
  paper?: Paper
  onPress: () => void
  /** 히어로가 출발할 사각형을 재려면 필요하다 */
  frameRef?: (v: View | null) => void
}

/**
 * 남긴 하루 한 칸 — 사진이거나 **종이**.
 *
 * 홈 · 내 프로필 · 남의 프로필이 **같은 것을 쓴다.**
 * 같은 하루가 화면마다 다른 크기·다른 모서리로 나오면 같은 것을 세 번 익혀야 한다.
 */
export default function PhotoFrame({ photo, note, paper, onPress, frameRef }: Props) {
  const pp = paperOf(paper)
  return (
    <Pressable style={styles.frame} onPress={onPress} accessibilityLabel="기록 보기">
      <View ref={frameRef} collapsable={false} style={StyleSheet.absoluteFill}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.paper, { backgroundColor: pp.bg }]}>
            {/*
              쓴 대로 보인다 — 왼쪽 위에서 시작, **상세와 같은 크기로** .
              칸이 납작해서 여덟 줄이면 꽉 찬다 — 나머지는 눌러서 상세에서 읽는다
            */}
            <Text style={[styles.paperText, { color: pp.ink }]} numberOfLines={8}>{note}</Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: TILE_RATIO,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.tile,
  },
  paper: { padding: 18 },
  paperText: { ...NOTE_FONT, fontWeight: '600' },
})
