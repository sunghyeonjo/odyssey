import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { useState } from 'react'
import { Image, type LayoutChangeEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg'
import type { PickedImage } from '@/lib/pickImage'
import { colors, text } from '@/theme'

/** 확대 한계. 더 키우면 원본 화소가 드러나 뭉갠 사진이 저장된다 */
const MAX_SCALE = 4
/** 자를 영역이 화면 폭에서 차지하는 비율. 양옆에 원본이 남아야 어디를 자르는지 보인다 */
const FRAME_RATIO = 0.78

/** 저장할 최대 가로 픽셀. 프로필 사진은 화면에서 82pt 를 넘게 쓸 일이 없다 */
const MAX_W = 512

interface Props {
  source: PickedImage | null
  onCancel: () => void
  onDone: (uri: string) => void
}

/**
 * 프로필 사진을 **정사각으로** 자르는 화면.
 *
 * 사진첩의 기본 편집기를 안 쓰는 이유 — `expo-image-picker` 의 `aspect` 는 안드로이드 전용이라
 * 두 플랫폼이 똑같이 동작하지 않는다.
 *
 * **원본은 잘리지 않고 그대로 보인다.** 틀 밖도 어둡게만 덮어 무엇이 잘려나가는지 보여준다 —
 * 틀 안만 보여주면 방금 무엇을 버렸는지 알 수가 없다.
 * 틀은 고정이고 사진이 움직인다: 끌어서 자리를 잡고 두 손가락으로 키운다.
 *
 * 비율·모양을 밖에서 받지 않는다 — 부르는 곳이 프로필 사진 하나뿐이다.
 */
export default function ImageCropper({ source, onCancel, onDone }: Props) {
  const [stage, setStage] = useState({ w: 0, h: 0 })
  const [saving, setSaving] = useState(false)

  // 틀은 정사각. 무대 안에 들어가는 한에서 가장 크게
  const VW = Math.max(1, Math.min(stage.w * FRAME_RATIO, stage.h * 0.86))
  const VH = VW

  // 원본 1px 이 화면에서 몇 px 인지. 1배일 때 틀을 꽉 덮는 값이 바닥이다
  const base = source && stage.w ? Math.max(VW / source.width, VH / source.height) : 1
  const imgW = (source?.width ?? 0) * base
  const imgH = (source?.height ?? 0) * base

  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const savedTx = useSharedValue(0)
  const savedTy = useSharedValue(0)

  const reset = () => {
    scale.value = 1; savedScale.value = 1
    tx.value = 0; ty.value = 0; savedTx.value = 0; savedTy.value = 0
  }

  /**
   * 사진이 틀 밖으로 밀려 빈 구석이 생기지 않게 가둔다.
   *
   * 가둔 값을 먼저 구해두고 두 곳에 같이 넣는다 — `withTiming` 을 걸고 나서 `.value` 를
   * 다시 읽으면 아직 애니메이션 전 값이라 저장해둔 위치가 화면과 어긋난다.
   */
  const clamp = () => {
    'worklet'
    const s = base * scale.value
    const maxX = Math.max(0, ((source?.width ?? 0) * s - VW) / 2)
    const maxY = Math.max(0, ((source?.height ?? 0) * s - VH) / 2)
    const nx = Math.min(maxX, Math.max(-maxX, tx.value))
    const ny = Math.min(maxY, Math.max(-maxY, ty.value))
    savedTx.value = nx
    savedTy.value = ny
    tx.value = withTiming(nx, { duration: 120 })
    ty.value = withTiming(ny, { duration: 120 })
  }

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX
      ty.value = savedTy.value + e.translationY
    })
    .onEnd(() => { savedTx.value = tx.value; savedTy.value = ty.value; clamp() })

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale))
    })
    .onEnd(() => { savedScale.value = scale.value; clamp() })

  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }))

  const done = async () => {
    if (!source || saving) return
    setSaving(true)
    try {
      const s = base * scale.value
      // 틀의 왼쪽 위가 원본에서 어디인지
      const left = ((source.width * s) / 2 - tx.value - VW / 2) / s
      const top = ((source.height * s) / 2 - ty.value - VH / 2) / s
      const cw = VW / s
      const ch = VH / s

      const crop = {
        originX: Math.round(Math.min(Math.max(0, left), Math.max(0, source.width - cw))),
        originY: Math.round(Math.min(Math.max(0, top), Math.max(0, source.height - ch))),
        width: Math.round(Math.min(cw, source.width)),
        height: Math.round(Math.min(ch, source.height)),
      }

      const ctx = ImageManipulator.manipulate(source.uri)
      ctx.crop(crop)
      if (crop.width > MAX_W) ctx.resize({ width: MAX_W })
      const ref = await ctx.renderAsync()
      const out = await ref.saveAsync({ compress: 0.85, format: SaveFormat.JPEG })
      onDone(out.uri)
    } finally {
      setSaving(false)
    }
  }

  const onStage = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setStage({ w: width, h: height })
  }

  return (
    <Modal visible={!!source} animationType="slide" onRequestClose={onCancel} onShow={reset}>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.bar}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.cancel}>취소</Text>
          </Pressable>
          <Text style={styles.title}>프로필 사진 자르기</Text>
          <Pressable onPress={done} hitSlop={10} disabled={saving}>
            <Text style={[styles.done, saving && styles.doneOff]}>완료</Text>
          </Pressable>
        </View>

        <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
          <View style={styles.stage} onLayout={onStage}>
            {source && stage.w > 0 && (
              /*
                자리를 플렉스 정렬에 맡기지 않는다 — 담긴 것이 부모보다 크면
                `justifyContent: center` 가 한쪽으로 쏠려버려서 사진이 무대 아래로 밀렸다.
                무대 크기와 사진 크기를 알고 있으니 좌표를 직접 계산한다
              */
              <Animated.View
                style={[
                  styles.img,
                  { left: (stage.w - imgW) / 2, top: (stage.h - imgH) / 2, width: imgW, height: imgH },
                  imgStyle,
                ]}
                pointerEvents="none"
              >
                <Image source={{ uri: source.uri }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            )}

            {/* 틀 밖을 덮어 무엇이 잘려나가는지 보여준다. 원형은 구멍도 원이어야 한다 */}
            {stage.w > 0 && (
              <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                <Defs>
                  <Mask id="hole">
                    <Rect x={0} y={0} width={stage.w} height={stage.h} fill="#fff" />
                    <Circle cx={stage.w / 2} cy={stage.h / 2} r={VW / 2} fill="#000" />
                  </Mask>
                </Defs>
                <Rect
                  x={0} y={0} width={stage.w} height={stage.h}
                  fill="rgba(12,13,16,0.55)" mask="url(#hole)"
                />
                <Circle
                  cx={stage.w / 2} cy={stage.h / 2} r={VW / 2}
                  stroke="rgba(255,255,255,0.9)" strokeWidth={2} fill="none"
                />
              </Svg>
            )}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // 화면을 통째로 덮고 사진만 주인공으로 두는 자리
  root: { flex: 1, backgroundColor: colors.stage },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  cancel: { fontSize: text.lead, color: 'rgba(255,255,255,0.75)' },
  title: { fontSize: text.lead, fontWeight: '700', color: '#fff' },
  done: { fontSize: text.lead, fontWeight: '700', color: '#fff' },
  doneOff: { opacity: 0.4 },

  stage: { flex: 1, overflow: 'hidden' },
  img: { position: 'absolute' },
})
