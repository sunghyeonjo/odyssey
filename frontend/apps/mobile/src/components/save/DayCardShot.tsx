import { useEffect, useRef, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import type { Paper } from '@/api/types'
import { PHOTO_RATIO } from '@/config'
import { dayLabel, parseKey, type DateKey } from '@/lib/date'
import { NOTE_FONT, paperOf } from '@/lib/paper'
import { colors, text as type } from '@/theme'

/**
 * 그리는 폭(pt)과 낼 때의 배수. `360 × 3 = 1080px` —
 * 기기 배율(2x·3x)에 따라 결과가 달라지지 않게 출력 크기를 **못 박는다.**
 */
const W = 360
const SCALE = 3
/** 카드 한 장의 키. 사진 비율과 같다 → **모든 카드가 같은 크기** */
const CARD_H = Math.round(W / PHOTO_RATIO)
/**
 * 사진이 이보다 짧아지면 사진이 아니라 띠가 된다.
 * 글이 아주 길면 카드가 대신 길어진다 — 글을 자르는 것보다 낫다
 */
const MIN_PHOTO = Math.round(W * 0.6)
/** 종이 안쪽 여백 — 컴포저의 종이와 같은 값이라야 줄바꿈이 같다 */
const PAPER_PAD = 24
/** 사진 아래 글판 여백 */
const PAD = 20

export interface DayShot {
  dateKey: DateKey
  text: string
  /** 없으면 종이에 쓴 날 */
  photo: string | null
  paper?: Paper
}

interface Props {
  /** 그릴 것. `null` 이면 아무것도 안 그린다 */
  job: DayShot | null
  /** 캡처가 끝나면 파일 경로, 못 하면 `null` */
  onDone: (uri: string | null) => void
}

/**
 * 그날 카드를 **화면 밖에 그려놓고 캡처**한다.
 *
 * **모든 카드가 `4:5` 한 크기다.** 사진칸이 글판이 쓰고 남은 자리를 채운다 —
 * 글이 길면 사진이 짧아질 뿐 카드 크기는 그대로다.
 *
 * 사진만 있는 날은 여기 안 온다 — 합성하면 재인코딩이라 그 순간 원본이 아니게 된다.
 *
 * `opacity: 0` 이 아니라 화면 밖으로 밀어내는 이유 — 투명한 뷰는 플랫폼에 따라
 * 캡처가 빈 그림으로 나온다.
 */
export default function DayCardShot({ job, onDone }: Props) {
  const ref = useRef<View>(null)
  /** 사진이 다 실렸는지. 안 실린 채로 찍으면 사진 자리가 빈다 */
  const [ready, setReady] = useState(false)
  /** 글판이 실제로 차지한 키. 이게 정해져야 사진칸이 정해진다 */
  const [bodyH, setBodyH] = useState(0)
  /** 이미 찍은 것. 한 번 더 찍으면 사진첩에 같은 날이 두 장 쌓인다 */
  const shot = useRef<DayShot | null>(null)
  /*
    콜백은 부를 때마다 새로 만들어지는 함수다. 지켜보는 값에 넣으면
    부모가 다시 그려질 때마다 타이머가 되감겨 영영 안 찍힌다
  */
  const cb = useRef(onDone)
  cb.current = onDone

  useEffect(() => {
    // 사진이 없으면 기다릴 것도 없다
    setReady(job !== null && job.photo === null)
    setBodyH(0)
  }, [job])

  const onPaper = job !== null && job.photo === null
  /*
    키를 **재지 않고 계산한다.** 바깥을 onLayout 으로 재면 사진칸이 정해지기 전 값으로
    한 번 찍히고, 정해진 뒤 또 찍힌다. 글판만 재면 나머지는 산수다
  */
  const photoH = onPaper ? 0 : Math.max(MIN_PHOTO, CARD_H - bodyH)
  const cardH = onPaper ? Math.max(CARD_H, bodyH) : photoH + bodyH

  useEffect(() => {
    if (job === null || !ready || bodyH === 0 || shot.current === job) return
    shot.current = job
    // 레이아웃이 실제로 올라간 다음 프레임에 찍는다
    const id = setTimeout(() => {
      captureRef(ref, {
        format: 'jpg',
        quality: 0.92,
        width: W * SCALE,
        height: Math.round(cardH * SCALE),
      })
        .then((uri) => cb.current(uri))
        .catch(() => cb.current(null))
    }, 80)
    return () => clearTimeout(id)
  }, [job, ready, bodyH, cardH])

  if (job === null) return null

  const pp = paperOf(job.paper)
  const note = job.text.trim()
  // 사진첩에서 3년 뒤에 봐도 어느 날인지 알아야 한다 → 화면과 달리 연도를 붙인다
  const stamp = `${parseKey(job.dateKey).getFullYear()}년 ${dayLabel(job.dateKey)}`

  return (
    <View style={styles.offscreen} pointerEvents="none">
      <View
        ref={ref}
        collapsable={false}
        style={[styles.card, { height: cardH }, onPaper && { backgroundColor: pp.bg }]}
      >
        {job.photo !== null && (
          <Image
            source={{ uri: job.photo }}
            style={{ width: W, height: photoH }}
            resizeMode="cover"
            // 못 실어도 진행한다 — 사진 없는 카드가 아예 안 나오는 것보다 낫다
            onLoad={() => setReady(true)}
            onError={() => setReady(true)}
          />
        )}

        <View
          onLayout={(e) => setBodyH(Math.ceil(e.nativeEvent.layout.height))}
          style={onPaper ? styles.paperBody : styles.body}
        >
          {note !== '' && (
            <Text style={[styles.note, { color: onPaper ? pp.ink : colors.ink }]}>{note}</Text>
          )}
          <Text style={[styles.date, onPaper && { color: pp.ink, opacity: 0.45 }]}>{stamp}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // 화면 밖. 자리는 차지하지만 눈에는 안 보인다
  offscreen: { position: 'absolute', left: -9999, top: 0 },
  card: { width: W, backgroundColor: colors.surface, overflow: 'hidden' },

  body: { padding: PAD, gap: 10 },
  // 글은 위에서부터 — 화면의 종이와 같다. 가운데로 모으면 같은 글이 두 곳에서 다르게 앉는다
  paperBody: { padding: PAPER_PAD, gap: 12 },

  note: { ...NOTE_FONT, fontWeight: '600' },
  date: { fontSize: type.caption, color: colors.faint },
})
