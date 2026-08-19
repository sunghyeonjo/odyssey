import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { errorMessage } from '@/api/error'
import ActionSheet from '@/components/ui/ActionSheet'
import { createEntry, getEntry } from '@/api/dayed'
import type { Paper, Visibility } from '@/api/types'
import { PHOTO_RATIO } from '@/config'
import { dayLabel, todayKey, type DateKey } from '@/lib/date'
import { DEFAULT_PAPER, NOTE_FONT, PAPER_BGS, PAPER_INKS, inkFor, paperOf } from '@/lib/paper'
import { colors, radius, space, text } from '@/theme'

interface ComposerApi {
  /**
   * 작성/수정 모달 열기. 그날 기록이 이미 있으면 채워서 연다.
   *
   * **사진은 안 받는다** — 늘 빈 종이로 열리고, 붙일지는 안에서 정한다.
   * 부르는 쪽이 미리 고르게 하면 사진첩을 닫아야 글을 쓸 수 있다.
   *
   * `onSaved` 를 주면 저장이 끝나고 모달이 닫힌 뒤에 불린다.
   */
  open: (opts?: { dateKey?: DateKey; onSaved?: (dateKey: DateKey) => void }) => void
}

const Ctx = createContext<ComposerApi | null>(null)
export const useComposer = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useComposer 는 ComposerProvider 안에서만')
  return c
}

/** 공개 범위 두 갈래. 기본값이 앞에 오지 않게 '나만 보기' 를 왼쪽에 둔다 */
const VIS_OPTIONS = [
  { value: 'private', label: '나만 보기', icon: 'lock-closed' },
  { value: 'friends', label: '친구에게 공개', icon: 'people' },
] as const

const MAX_TEXT = 280

/**
 * 빈 칸에 뜨는 말 — `나` 의 작성 줄이 묻던 것과 **같은 문장**이다.
 * 누르고 들어온 자리에서 질문이 바뀌면 다른 데로 온 것처럼 읽힌다.
 *
 * 다만 달력에서 **지난 날도 채울 수 있어서** 날짜에 따라 갈린다 —
 * 8월 3일을 채우는 중에 `오늘은` 이라고 물으면 틀린 말이 된다.
 */
const promptFor = (dateKey: DateKey) =>
  dateKey === todayKey() ? '오늘은 어떤 일이 있었나요?' : '그날은 어떤 일이 있었나요?'

/** 종이 안쪽 여백 — 상세의 종이와 같아야 줄바꿈이 같다 */
const PAPER_PAD = 24

export function ComposerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)
  const [dateKey, setDateKey] = useState<DateKey>(todayKey())
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  /** 누가 볼 수 있는지. 기본은 친구 공개 — 이 앱은 보여주려고 쓰는 앱이다 */
  const [visibility, setVisibility] = useState<Visibility>('friends')
  /** 사진 없이 글만 남길 때의 종이. 사진을 고르면 안 쓰인다 */
  const [paper, setPaper] = useState<Paper>(DEFAULT_PAPER)
  const [editing, setEditing] = useState(false)
  /** 사진을 돌리는 동안. 연타로 파일이 줄줄이 생기는 걸 막는다 */
  const [rotating, setRotating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { width: screenW } = useWindowDimensions()
  const [kbHeight, setKbHeight] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedCb = useRef<((dateKey: DateKey) => void) | null>(null)
  /** 사진을 어디서 가져올지 묻는 시트 */
  const [picking, setPicking] = useState(false)
  const plainScroll = useRef<ScrollView>(null)
  const paperScroll = useRef<ScrollView>(null)
  /** 종이에 쓰는 중인지 · 글이 지금 몇 픽셀인지 — 커서를 따라갈지 판단하는 데만 쓴다 */
  const typing = useRef(false)
  const paperTextH = useRef(0)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  /** 키보드가 올라오면 그 높이만큼 바닥을 들어 올려 입력창·공유 바가 가리지 않게 한다 */
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const s = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height))
    const h = Keyboard.addListener(hideEvt, () => setKbHeight(0))
    return () => { s.remove(); h.remove() }
  }, [])

  /** 사진첩에서 한 장 고르기. 취소면 null */
  const pickOne = useCallback(async (): Promise<string | null> => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      // 사진첩에서 가져온 것도 다시 압축하지 않는다 — 일기에 남길 사진이다
      quality: 1,
    })
    return res.canceled ? null : (res.assets[0]?.uri ?? null)
  }, [])

  /**
   * **시스템 카메라**로 찍기.
   *
   * 앱 안에 뷰파인더를 직접 띄웠다가 걷어냈다 — 화각·비율·해상도·줌을 전부 우리가
   * 맞춰야 했고, 그래놓고도 기본 카메라보다 작고 어색했다.
   * 이건 애플이 만든 그 화면이라 전체화면·줌·플래시가 그냥 다 있다.
   */
  const shootOne = useCallback(async (): Promise<string | null> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return null
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
    return res.canceled ? null : (res.assets[0]?.uri ?? null)
  }, [])

  const open = useCallback<ComposerApi['open']>(async (opts) => {
    const dk = opts?.dateKey ?? todayKey()
    // 그날 글이 이미 있으면 수정 모드로 채워서 연다
    const existing = await getEntry(dk).catch(() => null)
    // 고칠 때는 있던 사진을 그대로 이어받는다 — 사진은 못 바꾼다. 새로 쓸 때는 빈 종이
    const initial = existing?.photos[0] ?? null
    setDateKey(dk)
    savedCb.current = opts?.onSaved ?? null
    setError(null)
    setEditing(!!existing)
    setText(existing?.text ?? '')
    setPhoto(initial)
    setVisibility(existing?.visibility ?? 'friends')
    setPaper(paperOf(existing?.paper))
    setVisible(true)
  }, [])

  const close = useCallback(() => { Keyboard.dismiss(); savedCb.current = null; setVisible(false) }, [])

  /**
   * 사진은 **처음 남길 때 한 번**만 고른다.
   * 이미 올린 기록의 사진을 갈아끼우면 친구들이 남긴 좋아요·댓글이 딴 사진에 붙는다.
   * 고칠 수 있는 건 글뿐 — 사진을 바꾸려면 지우고 다시 남긴다(오늘 것만 가능).
   *
   * 손잡이 자체를 안 그리지만, 어디선가 새어 들어와도 막히도록 여기서 한 번 더 잠근다.
   */
  const changePhoto = useCallback(() => {
    if (editing) {
      showToast('사진은 바꿀 수 없어요. 지우고 다시 남겨 주세요')
      return
    }
    setPicking(true)
  }, [editing, showToast])

  /**
   * 시트에서 고른 뒤. 취소하면 아무 일도 안 일어난다.
   *
   * **시트가 닫히는 걸 기다렸다 띄운다.** 곧바로 부르면 iOS 가 닫히는 중인 모달 위에
   * 사진첩을 못 올려서 아무 일도 안 일어난 것처럼 보인다 —
   * 이 파일의 저장 후 콜백이 `320` 을 기다리는 것과 같은 이유다.
   */
  const takeFrom = useCallback((from: 'camera' | 'library') => {
    setPicking(false)
    setTimeout(async () => {
      const next = await (from === 'camera' ? shootOne() : pickOne())
      if (next !== null) setPhoto(next)
    }, 320)
  }, [shootOne, pickOne])

  /**
   * 사진을 90도씩 돌린다.
   *
   * 찍을 때 EXIF 방향값을 읽어 자동으로 세워보려 했으나 기기·OS 마다 다르게 붙어서
   * 맞을 때보다 틀릴 때가 더 성가셨다. **보고 있는 사람이 한 번 누르는 게 확실하다.**
   * 돌린 결과는 파일에 구워지므로 저장 뒤에도 그 방향 그대로다.
   */
  const rotate = useCallback(async () => {
    if (photo === null || rotating) return
    setRotating(true)
    try {
      const ctx = ImageManipulator.manipulate(photo)
      ctx.rotate(90)
      const ref = await ctx.renderAsync()
      // 돌릴 때마다 다시 압축된다 → 여러 번 눌러도 안 뭉개지게 손실을 최소로
      const out = await ref.saveAsync({ compress: 1, format: SaveFormat.JPEG })
      setPhoto(out.uri)
    } catch {
      showToast('사진을 돌리지 못했어요')
    } finally {
      setRotating(false)
    }
  }, [photo, rotating, showToast])

  const save = useMutation({
    mutationFn: () =>
      createEntry({
        dateKey,
        text: text.trim(),
        photos: photo !== null ? [photo] : [],
        visibility,
        // 사진이 있으면 종이는 안 쓰인다 → 안 보낸다
        paper: photo === null ? paper : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      Keyboard.dismiss()
      setVisible(false)
      // 지나간 날도 채울 수 있으므로 '오늘' 이라고 단정하지 않는다
      showToast(
        editing
          ? '기록을 수정했어요'
          : dateKey === todayKey()
            ? '오늘의 한 컷을 담았어요'
            : `${dayLabel(dateKey)}을 채웠어요`,
      )
      // 모달 두 개가 겹치면 iOS 에서 충돌 → 닫히는 애니메이션이 끝난 뒤에 넘긴다
      const cb = savedCb.current
      if (cb) setTimeout(() => cb(dateKey), 320)
    },
    onError: (e) => setError(errorMessage(e, '저장하지 못했습니다')),
  })

  // 글만 있는 기록도 저장할 수 있어야 한다 (달력 우표의 note 상태 · 피드의 종이 카드)
  const canSubmit = (photo !== null || text.trim() !== '') && !save.isPending
  /** 빈 종이도 종이로 보여야 한다 — 사진이 왔을 자리와 같은 크기에서 시작한다 */
  const paperH = Math.round(screenW / PHOTO_RATIO)
  const label = dayLabel(dateKey)
  const prompt = promptFor(dateKey)

  const api = useMemo<ComposerApi>(() => ({ open }), [open])

  return (
    <Ctx.Provider value={api}>
      {children}

      {toast !== null && (
        <View style={styles.toastWrap} pointerEvents="none">
          <Text style={styles.toast}>{toast}</Text>
        </View>
      )}

      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
          {/* 정석 피드 형태 — 사진과 글이 분리된다.
              키보드가 올라오면 그 높이만큼 바닥을 들어 올려 입력창·공유 바가 가리지 않게 한다 */}
          <View style={[styles.plainRoot, Platform.OS === 'ios' && { paddingBottom: kbHeight }]}>
            <View style={[styles.plainNav, { paddingTop: insets.top + 8 }]}>
              <Pressable onPress={close} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.sub} />
              </Pressable>
              <Text style={styles.plainDate}>{label}</Text>
              {/* 사진 손잡이는 아래 도구줄로 내렸다 — 위쪽은 손가락에서 멀고 눈에도 안 띈다 */}
              <View style={styles.navPad} />
            </View>

            {photo !== null ? (
            <ScrollView
              ref={plainScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
                <View>
                  {editing ? (
                    <Image source={{ uri: photo }} style={[styles.plainPhoto, { aspectRatio: PHOTO_RATIO }]} resizeMode="cover" />
                  ) : (
                    <Pressable onPress={changePhoto}>
                      <Image source={{ uri: photo }} style={[styles.plainPhoto, { aspectRatio: PHOTO_RATIO }]} resizeMode="cover" />
                    </Pressable>
                  )}
                  {/* 올린 사진은 못 바꾼다 → 돌리기도 담기 전에만 */}
                  {!editing && (
                    <Pressable style={styles.rotate} onPress={rotate} disabled={rotating} hitSlop={8}>
                      {rotating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="sync-outline" size={14} color="#fff" />
                          <Text style={styles.rotateText}>회전</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>

              <TextInput
                style={styles.plainInput}
                value={text}
                onChangeText={(t) => setText(t.slice(0, MAX_TEXT))}
                placeholder={prompt}
                placeholderTextColor={colors.faint}
                multiline
                // 사진이 화면을 거의 채우므로 입력창은 스크롤 아래에 있다 → 포커스되면 끌어올린다
                onFocus={() => setTimeout(() => plainScroll.current?.scrollToEnd({ animated: true }), 180)}
              />

              <Text style={styles.plainCount}>{text.length} / {MAX_TEXT}</Text>
            </ScrollView>
            ) : (
              /*
                사진이 없으면 **종이가 사진 자리에 그대로 들어선다** — 같은 폭에 같은 비율.
                종이는 글에 따라 길어지고, 그 아래 색 고르기까지 **스크롤로** 오간다.
                키보드는 아래로 끌면 내려간다(`interactive`) — 내리는 버튼을 따로 두지 않는다.
              */
              <ScrollView
                ref={paperScroll}
                style={styles.paperStage}
                contentContainerStyle={styles.paperScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                {/*
                  **입력칸을 무엇으로도 감싸지 않는다.** `Pressable` 로 감싸 빈자리를 눌러도
                  포커스되게 했었는데, 그 부모가 터치를 가로채 **꾹 눌러 붙여넣기**가 안 됐다.
                  대신 입력칸 자체가 종이를 꽉 채운다(`minHeight`) — 빈자리도 입력칸이라 눌리고,
                  꾹 누르면 iOS 기본 편집 메뉴가 그대로 뜬다.
                */}
                <View style={[styles.paper, { backgroundColor: paper.bg }]}>
                  <TextInput
                    // 볼 때와 같은 크기라 쓴 그대로 남는다
                    style={[styles.paperInput, { color: paper.ink, minHeight: paperH - PAPER_PAD * 2 }]}
                    value={text}
                    onChangeText={(t) => setText(t.slice(0, MAX_TEXT))}
                    placeholder={prompt}
                    // 종이 색이 바뀌면 안내 문구도 그 위에서 읽혀야 한다 — 어두운 종이엔 흰 쪽으로
                    placeholderTextColor={paper.ink === PAPER_INKS[1] ? 'rgba(255,255,255,0.45)' : 'rgba(25,29,36,0.3)'}
                    multiline
                    // 새로 쓸 때는 바로 칠 수 있게. 고칠 때는 읽어보고 손대는 경우가 많아 안 올린다
                    autoFocus={!editing}
                    // 스크롤은 바깥이 맡는다 — 안팎이 둘 다 스크롤하면 어느 쪽이 움직일지 알 수 없다
                    scrollEnabled={false}
                    onFocus={() => { typing.current = true }}
                    onBlur={() => { typing.current = false }}
                    /*
                      쓰는 동안 글이 길어지면 커서가 키보드 아래로 숨는다 → 끝을 따라간다.
                      **쓰고 있을 때 · 길어질 때만** — 안 그러면 열자마자 긴 글의 끝으로 튄다
                    */
                    onContentSizeChange={(e) => {
                      const h = e.nativeEvent.contentSize.height
                      if (typing.current && h > paperTextH.current) {
                        paperScroll.current?.scrollToEnd({ animated: false })
                      }
                      paperTextH.current = h
                    }}
                  />
                </View>

                <Text style={styles.plainCount}>{text.length} / {MAX_TEXT}</Text>

                {/* 색 고르기는 늘 여기 있다 — 쓰다가 바꾸려고 키보드를 내릴 일이 없다 */}
                <View style={styles.swatches}>
                  <View style={styles.swatchRow}>
                    <Text style={styles.swatchLabel}>배경</Text>
                    {PAPER_BGS.map((bgc) => (
                      <Pressable
                        key={bgc}
                        // 배경을 고르면 글씨는 읽히는 쪽으로 먼저 맞춘다. 뒤집는 건 그 다음 줄에서
                        onPress={() => setPaper({ bg: bgc, ink: inkFor(bgc) })}
                        style={[
                          styles.swatch,
                          { backgroundColor: bgc },
                          paper.bg === bgc && styles.swatchOn,
                        ]}
                        accessibilityLabel={`배경 ${bgc}`}
                      />
                    ))}
                  </View>
                  <View style={styles.swatchRow}>
                    <Text style={styles.swatchLabel}>글씨</Text>
                    {PAPER_INKS.map((ic) => (
                      <Pressable
                        key={ic}
                        onPress={() => setPaper((p) => ({ ...p, ink: ic }))}
                        style={[styles.swatch, { backgroundColor: ic }, paper.ink === ic && styles.swatchOn]}
                        accessibilityLabel={`글씨 ${ic}`}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* 키보드 높이에 홈 인디케이터 영역이 이미 들어 있어 그때는 안전 영역을 더하지 않는다 */}
            <View style={[styles.plainBottom, { paddingBottom: (kbHeight > 0 ? 0 : insets.bottom) + 14 }]}>
              {/*
                한 줄에 둘 — 왼쪽은 **더할 것**(사진), 오른쪽은 **정할 것**(공개 범위).
                키보드 바로 위라 둘 다 엄지에 닿는다. 위쪽 손잡이는 눈에도 손에도 멀었다.
              */}
              <View style={styles.tools}>
                <Pressable
                  style={styles.tool}
                  onPress={changePhoto}
                  hitSlop={8}
                  accessibilityLabel="사진 추가"
                >
                  <Ionicons
                    name={photo !== null ? 'image' : 'image-outline'}
                    size={22}
                    color={editing ? colors.faint : photo !== null ? colors.accent : colors.ink}
                  />
                </Pressable>

                {/* 공개 범위 — 축은 이것 하나뿐이다. 언제든 되돌릴 수 있어 확인은 받지 않는다 */}
                <View style={styles.segment}>
                  {VIS_OPTIONS.map((o) => {
                    const on = visibility === o.value
                    return (
                      <Pressable
                        key={o.value}
                        style={[styles.segItem, on && styles.segItemOn]}
                        onPress={() => setVisibility(o.value)}
                      >
                        <Ionicons name={o.icon} size={13} color={on ? '#fff' : colors.sub} />
                        <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {error !== null && <Text style={styles.plainError}>{error}</Text>}

              <Pressable
                style={[styles.submit, !canSubmit && styles.submitOff]}
                onPress={() => canSubmit && save.mutate()}
                disabled={!canSubmit}
              >
                {save.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitLabel}>담기</Text>}
              </Pressable>
            </View>
          </View>
        <ActionSheet
          visible={picking}
          title="사진 추가"
          cancelLabel="취소"
          actions={[
            { label: '사진 찍기', icon: 'camera-outline', onPress: () => takeFrom('camera') },
            { label: '사진첩에서 고르기', icon: 'images-outline', onPress: () => takeFrom('library') },
          ]}
          onClose={() => setPicking(false)}
        />
      </Modal>
    </Ctx.Provider>
  )
}

const styles = StyleSheet.create({
  /** 왼쪽 사진 · 오른쪽 공개 범위. 키보드 바로 위 한 줄 */
  tools: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tool: { width: 40, height: 40, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'row' },

  // 공개 범위 — 두 갈래라 칩 목록보다 세그먼트가 맞다.
  // 폭을 다 쓰지 않는다: 왼쪽 사진 손잡이와 한 줄을 나눠 쓰고, 하루에 한 번 정하는 것이라 작아도 된다
  segment: { flexDirection: 'row', gap: space.xs, padding: 3, marginLeft: 'auto', borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  segItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: radius.pill },
  segItemOn: { backgroundColor: colors.accent },
  segText: { fontSize: text.caption, fontWeight: '700', color: colors.sub },
  segTextOn: { color: '#fff' },
  submit: { backgroundColor: colors.accent, borderRadius: radius.card, paddingVertical: 16, alignItems: 'center' },
  submitOff: { opacity: 0.4 },
  submitLabel: { color: '#fff', fontSize: text.lead, fontWeight: '700' },

  plainRoot: { flex: 1, backgroundColor: colors.bg },
  plainNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  plainDate: { fontSize: text.small, color: colors.sub },
  // 사진 손잡이가 빠져도 날짜가 가운데 남게 닫기 버튼만큼 자리를 잡아둔다
  navPad: { width: 24 },
  plainPhoto: { width: '100%', backgroundColor: colors.line },
  // 사진 위 오른쪽 아래 — 사진을 가리지 않으면서 사진에 붙은 것으로 읽히는 자리
  rotate: {
    position: 'absolute', right: 14, bottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 32, minWidth: 32, paddingHorizontal: 11, borderRadius: radius.pill,
    backgroundColor: 'rgba(11,13,17,0.55)', justifyContent: 'center',
  },
  rotateText: { fontSize: text.caption, fontWeight: '700', color: '#fff' },

  /*
    사진 자리를 그대로 물려받는다 — 상세의 종이와 **같은 폭 · 같은 안쪽 여백**이라
    줄바꿈이 같고 쓴 그대로 남는다. 높이는 글을 따라 늘어난다(빈 종이는 사진 자리만큼).
    글은 왼쪽 위에서 시작한다 — 가운데로 모으면 쓰는 동안 글자가 좌우로 밀려 눈이 못 따라간다.
  */
  paper: { width: '100%', padding: PAPER_PAD },
  paperInput: { ...NOTE_FONT, width: '100%', fontWeight: '600', textAlignVertical: 'top' },
  paperStage: { flex: 1 },
  // 종이 · 글자 수 · 색 고르기 사이 간격은 이 `gap` 하나
  paperScroll: { paddingBottom: space.xl, gap: space.md },

  swatches: { paddingHorizontal: 20, gap: space.md },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  swatchLabel: { width: 30, fontSize: text.caption, fontWeight: '600', color: colors.sub },
  // 테두리는 늘 있고 고른 것만 짙어진다 — 흰 종이도 바탕 위에서 보여야 한다
  swatch: { width: 24, height: 24, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  swatchOn: { borderWidth: 2.5, borderColor: colors.accent },
  plainInput: { paddingHorizontal: 20, paddingTop: space.lg, fontSize: text.lead, lineHeight: 24, color: colors.ink, minHeight: 96, textAlignVertical: 'top' },
  plainCount: { fontSize: text.micro, color: colors.faint, textAlign: 'right', paddingHorizontal: 20 },
  plainBottom: { paddingTop: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  plainError: { color: colors.danger, fontSize: text.small, marginBottom: 8 },

  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 44, alignItems: 'center', zIndex: 100 },
  toast: { backgroundColor: colors.ink, color: '#fff', fontSize: text.body, fontWeight: '600', paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.pill, overflow: 'hidden' },
})
