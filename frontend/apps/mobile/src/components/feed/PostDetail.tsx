import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { FeedItem } from '@/api/types'
import PostCard, { CARD, cardPhoto } from '@/components/feed/PostCard'
import type { DateKey } from '@/lib/date'
import { NOTE_FONT, paperOf } from '@/lib/paper'
import { colors, radius } from '@/theme'

/** 히어로가 출발하는 화면상 사각형. 부르는 쪽이 눌린 사진을 재서 넘긴다 */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** 히어로 비행 시간 — 도착 뒤 실제 사진으로 넘기는 타이밍도 여기에 맞춘다 */
const FLY_MS = 460
const NAV_H = 44

// ── 닫기 제스처 감도 ──
/** 이만큼 끌면 제스처가 붙는다. 너무 크면 뻣뻣하고, 너무 작으면 탭·스크롤을 뺏는다 */
const ACTIVATE = 14
/** 닫히는 임계 — 화면 너비/높이 대비 */
const DISMISS_X = 0.24
const DISMISS_Y = 0.12
/** 짧게 튕겨도 닫히게 (px/s). 최소 이동은 ACTIVATE 로 함께 건다 */
const FLICK = 650
/** 진행률을 임계의 몇 배 거리에 펼칠지. 2 면 임계에서 절반쯤 접혀 "놓으면 닫힌다"가 보인다 */
const PROGRESS_SPAN = 2

/** 연 하루 위아래로 이어지는 다른 하루들 */
export interface DayItem {
  dateKey: DateKey
  item: FeedItem
  dateLabel: string
  /** 내 기록일 때만 — 제 머리글 오른쪽에 붙는 손잡이 */
  onMore?: () => void
  onToggleLike?: () => void
}

/**
 * 한 번에 올려두는 앞뒤 하루 수.
 * 칸마다 큰 사진을 하나씩 물고 있어 석 달치를 다 올리면 여는 순간부터 버벅인다.
 * 더 멀리 가려면 달력에서 그날을 누른다 — 그게 원래 먼 날로 가는 길이다.
 */
const WINDOW = 10

/**
 * 이 앱에서 시간은 늘 아래로 흐른다 — **위가 과거, 아래가 최신**.
 * 순서 규칙은 여기 한 곳에서만 정한다.
 */
export function splitTimeline(days: DayItem[], focus: DateKey) {
  const sorted = [...days].sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1))
  return {
    // 둘 다 **연 하루에 가까운 쪽**을 남긴다 — 먼 과거보다 어제가 먼저 궁금하다
    earlier: sorted.filter((d) => d.dateKey < focus).slice(-WINDOW),
    later: sorted.filter((d) => d.dateKey > focus).slice(0, WINDOW),
  }
}

interface Props {
  item: FeedItem
  dateLabel: string
  /** 카드 사진이 있던 화면 좌표 */
  from: Rect
  /** 연 하루 앞뒤의 기록들 — 둘 다 오래된 것부터. `earlier` 는 위, `later` 는 아래(오늘 쪽) */
  earlier?: DayItem[]
  later?: DayItem[]
  onClose: () => void
  /** 작성자 줄을 눌렀을 때. 내 기록이면 갈 곳이 없어 안 준다 */
  onOpenProfile?: () => void
  /** 내 기록일 때만 */
  onMore?: () => void
  onToggleLike: () => void
  onCommentsChanged: () => void
}

/**
 * 카드에서 확대되는 상세 — **같은 카드를 세로로 쌓은 타임라인.**
 * 새 화면으로 push 하지 않고 같은 화면 위에 덮는다. 그래야 출발·도착 좌표가 정확히 맞는다.
 */
export default function PostDetail({ item, dateLabel, from, earlier, later, onClose, onOpenProfile, onMore, onToggleLike, onCommentsChanged }: Props) {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const t = useSharedValue(0)
  /** 아래로 당기는 동안 손가락을 따라가는 여분의 이동 */
  const dragY = useSharedValue(0)
  /** 히어로가 도착할 때까지는 본문을 스크롤하지 못하게 막는다 */
  const [landed, setLanded] = useState(false)
  const [closing, setClosing] = useState(false)
  /** 맨 위일 때만 아래로 당겨 닫기 — 아니면 본문 스크롤과 싸운다 */
  const [atTop, setAtTop] = useState(true)

  /**
   * 앞선 하루들이 위에 쌓이므로 연 하루는 스크롤 한가운데에 있다.
   * 위쪽 사진이 늦게 로드되며 칸이 자라면 자리가 밀리므로, 손을 대기 전까진 그때마다 다시 맞춘다.
   */
  const scrollRef = useRef<ScrollView>(null)
  const anchored = useRef(false)
  const focusY = useRef(0)
  const stick = () => {
    if (anchored.current) return
    scrollRef.current?.scrollTo({ y: Math.max(0, focusY.current - (insets.top + NAV_H)), animated: false })
  }

  const pp = paperOf(item.paper)
  /** 히어로가 앉을 자리 — 카드 안 사진의 좌표. 카드 치수가 고정이라 계산으로 나온다 */
  const photo = cardPhoto(width)
  const to: Rect = {
    x: CARD.gutter + CARD.pad,
    y: insets.top + NAV_H + CARD.pad + CARD.head + CARD.gap,
    w: photo.w,
    h: photo.h,
  }

  useEffect(() => {
    t.value = withTiming(1, { duration: FLY_MS, easing: Easing.bezier(0.32, 0.9, 0.3, 1) })
    const id = setTimeout(() => setLanded(true), FLY_MS)
    return () => clearTimeout(id)
  }, [t])

  const close = () => {
    if (closing) return
    setClosing(true)
    // 스와이프로 이미 절반쯤 접혔으면 남은 만큼만 되감는다
    const ms = Math.max(160, Math.round(FLY_MS * t.value))
    t.value = withTiming(0, { duration: ms, easing: Easing.bezier(0.32, 0.9, 0.3, 1) })
    setTimeout(onClose, ms)
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true })
    return () => sub.remove()
  })

  const commitX = width * DISMISS_X
  const commitY = height * DISMISS_Y
  /** 임계를 넘는 순간 한 번만 울린다 — 손을 떼기 전에 닫힐지 알 수 있게 */
  const crossed = useSharedValue(false)
  const tick = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined) }

  /** 가로 스와이프 back — 상세는 화면이 아니라 오버레이라 스택 제스처 대신 여기서 직접 받는다 */
  const swipeBack = Gesture.Pan()
    .enabled(!closing)
    .activeOffsetX(ACTIVATE)
    .failOffsetX(-14)
    // 세로 허용치를 활성 거리보다 넉넉히 둬야 비스듬한 스와이프도 잡힌다
    .failOffsetY([-30, 30])
    .onUpdate((e) => {
      const dx = Math.max(0, e.translationX)
      t.value = Math.max(0, 1 - dx / (commitX * PROGRESS_SPAN))
      const over = dx > commitX
      if (over !== crossed.value) { crossed.value = over; if (over) runOnJS(tick)() }
    })
    .onEnd((e) => {
      crossed.value = false
      if (e.translationX > commitX || (e.velocityX > FLICK && e.translationX > ACTIVATE)) runOnJS(close)()
      else t.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
    })

  /**
   * 아래로 당겨 닫기. 위에 앞선 하루들이 쌓여 있으면 아래로 당기는 건
   * '과거로 올라가는' 동작이라 닫기와 겹친다 → 그럴 땐 끄고 ✕ 와 오른쪽 스와이프가 맡는다.
   */
  const pullDown = Gesture.Pan()
    .enabled(atTop && !earlier?.length && !closing)
    .activeOffsetY(ACTIVATE)
    .failOffsetY(-14)
    .failOffsetX([-34, 34])
    .onUpdate((e) => {
      const dy = Math.max(0, e.translationY)
      t.value = Math.max(0, 1 - dy / (commitY * PROGRESS_SPAN))
      dragY.value = dy * 0.35
      const over = dy > commitY
      if (over !== crossed.value) { crossed.value = over; if (over) runOnJS(tick)() }
    })
    .onEnd((e) => {
      crossed.value = false
      dragY.value = withTiming(0, { duration: 220 })
      if (e.translationY > commitY || (e.velocityY > FLICK && e.translationY > ACTIVATE)) runOnJS(close)()
      else t.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
    })

  const heroStyle = useAnimatedStyle(() => ({
    left: from.x + (to.x - from.x) * t.value,
    top: from.y + (to.y - from.y) * t.value,
    width: from.w + (to.w - from.w) * t.value,
    height: from.h + (to.h - from.h) * t.value,
    transform: [{ translateY: dragY.value }],
  }))

  const scrimStyle = useAnimatedStyle(() => ({ opacity: t.value }))
  /**
   * 히어로와 본문 사진은 정확히 한쪽만 보인다.
   * 리액트 상태로 갈아끼우면 제스처가 시작되는 프레임에 리렌더가 끼어 손이 걸린다
   * → t 만 보고 UI 스레드에서 가른다.
   */
  const heroFade = useAnimatedStyle(() => ({ opacity: t.value > 0.995 ? 0 : 1 }))
  const slotStyle = useAnimatedStyle(() => ({ opacity: t.value > 0.995 ? 1 : 0 }))
  // 카드 자체는 조금 늦게 따라 올라온다. 그 안의 사진 자리는 slotStyle 이 따로 잡고 있다
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (t.value - 0.35) / 0.65),
    transform: [{ translateY: (1 - t.value) * 22 }],
  }))

  return (
    <GestureDetector gesture={Gesture.Race(swipeBack, pullDown)}>
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />

      <View style={StyleSheet.absoluteFill}>
        <ScrollView
          ref={scrollRef}
          scrollEnabled={landed}
          onScrollBeginDrag={() => { anchored.current = true }}
          // 위쪽 칸의 사진이 로드되며 높이가 바뀌면 자리가 밀린다 → 손대기 전까진 그때마다 다시 세운다
          onContentSizeChange={stick}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          scrollEventThrottle={16}
          // 맨 위인지만 알면 된다 → 값이 바뀔 때만 리렌더
          onScroll={(e) => {
            const next = e.nativeEvent.contentOffset.y <= 2
            setAtTop((prev) => (prev === next ? prev : next))
          }}
          // 막대가 카드 위에 떠 있으므로 본문이 그 높이만큼 내려온다.
          // 이 값이 곧 히어로 도착 좌표(to.y)의 앞부분이라 둘은 늘 같이 움직인다
          contentContainerStyle={{ paddingTop: insets.top + NAV_H, paddingBottom: insets.bottom + CARD.gutter }}
        >
          {/* 이 앱은 어디서나 위가 과거다 — 앞선 하루들은 위에 쌓이고, 올려야 만난다 */}
          {!!earlier?.length && (
            <Animated.View style={bodyStyle}>
              {earlier.map((m) => (
                <PostCard
                  key={m.item.id}
                  item={m.item}
                  dateLabel={m.dateLabel}
                  onToggleLike={m.onToggleLike}
                  onMore={m.onMore}
                  onOpenProfile={onOpenProfile}
                  onCommentsChanged={onCommentsChanged}
                />
              ))}
            </Animated.View>
          )}

          <Animated.View
            style={bodyStyle}
            onLayout={(e) => { focusY.current = e.nativeEvent.layout.y; stick() }}
          >
            <PostCard
              item={item}
              dateLabel={dateLabel}
              onToggleLike={onToggleLike}
              onMore={onMore}
              onOpenProfile={onOpenProfile}
              onCommentsChanged={onCommentsChanged}
              comments="open"
              slotStyle={slotStyle}
            />
          </Animated.View>

          {/* 아래는 오늘 쪽 — 누른 날 이후의 하루들 */}
          {!!later?.length && (
            <Animated.View style={bodyStyle}>
              {later.map((m) => (
                <PostCard
                  key={m.item.id}
                  item={m.item}
                  dateLabel={m.dateLabel}
                  onToggleLike={m.onToggleLike}
                  onMore={m.onMore}
                  onOpenProfile={onOpenProfile}
                  onCommentsChanged={onCommentsChanged}
                />
              ))}
            </Animated.View>
          )}
        </ScrollView>

        {/*
          막대는 카드 위에 반투명·블러로 뜬다. 본문보다 뒤에 그려야 위에 얹힌다.
          **나가는 길 하나뿐이다** — 날짜도 이름도 안 적는다. 카드마다 제 머리글이 이고 있다
        */}
        <Animated.View style={[styles.navWrap, { height: insets.top + NAV_H }, scrimStyle]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.navVeil]} pointerEvents="none" />
          <View style={[styles.nav, { paddingTop: insets.top }]}>
            <Pressable onPress={close} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </Pressable>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.hero, heroStyle, heroFade]} pointerEvents="none">
        {item.photos[0] ? (
          <Image source={{ uri: item.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.paper, { backgroundColor: pp.bg }]}>
            {/* 히어로는 날아가는 동안만 보인다 — 도착하면 카드 안 종이가 그대로 받는다 */}
            <Text style={[styles.note, { color: pp.ink }]}>{item.text}</Text>
          </View>
        )}
      </Animated.View>
    </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.bg },

  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  navVeil: { backgroundColor: 'rgba(255,255,255,0.62)' },
  nav: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },

  // 카드 안 사진과 같은 모서리로 날아간다
  hero: { position: 'absolute', overflow: 'hidden', borderRadius: radius.photo, backgroundColor: colors.tile },
  paper: { padding: 24 },
  note: NOTE_FONT,
})
