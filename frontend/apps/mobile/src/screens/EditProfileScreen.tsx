import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as authApi from '@/api/auth'
import { getMe, updateMe } from '@/api/dayed'
import { errorMessage } from '@/api/error'
import { qk } from '@/api/keys'
import type { Me } from '@/api/types'
import Avatar from '@/components/ui/Avatar'
import ImageCropper from '@/components/ui/ImageCropper'
import { NICKNAME_MAX, isNickname, nicknameError } from '@/lib/authRules'
import { pickImage, type PickedImage } from '@/lib/pickImage'
import { authStyles as s } from '@/screens/authStyles'
import { colors, space, text } from '@/theme'

/** 가입 화면과 같은 값 — 한 글자마다 서버를 때리지 않는다 */
const CHECK_MS = 400
/** `unknown` 은 서버가 답을 안 준 것. 막지 않고 저장에서 판정한다 */
type Taken = 'idle' | 'checking' | 'free' | 'taken' | 'unknown'

/**
 * 프로필 편집 — **고치는 자리는 여기 하나뿐이다.**
 *
 * 예전엔 `나` 의 얼굴을 눌러 사진만 바꿀 수 있었다. 닉네임은 길이 아예 없었고,
 * 사진은 프로필 카드에서, 이름은 어디에서도 못 고치니 규칙이 없었다.
 * 이제 카드는 **보는 것**, 이 화면이 **고치는 것**이다.
 *
 * 닉네임 규칙·중복 확인·문구는 가입 화면과 **같은 것**을 쓴다(`lib/authRules`).
 * 두 벌을 두면 가입은 통과한 이름이 편집에서 막히는 일이 생긴다.
 */
export default function EditProfileScreen() {
  const navigation = useNavigation<any>()
  const queryClient = useQueryClient()
  const meQ = useQuery({ queryKey: qk.me, queryFn: getMe })
  const me = meQ.data

  /** `null` 이면 아직 안 건드림 — 불러온 값이 늦게 와도 덮어쓰지 않는다 */
  const [typed, setTyped] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  /** 고른 사진. 자르기가 끝나야 미리보기로 올라간다 */
  const [cropping, setCropping] = useState<PickedImage | null>(null)
  const [taken, setTaken] = useState<Taken>('idle')
  const [error, setError] = useState<string | null>(null)

  const current = me?.name ?? ''
  const name = typed ?? current
  const trimmed = name.trim()
  const nameChanged = trimmed !== current
  const badName = nicknameError(name)

  /** 지금 쓰는 이름은 겹친 게 아니다 → 안 바꿨으면 물어보지 않는다 */
  useEffect(() => {
    if (!nameChanged || !isNickname(name)) {
      setTaken('idle')
      return
    }
    setTaken('checking')
    const id = setTimeout(() => {
      authApi.checkNickname(trimmed)
        .then((free) => setTaken(free ? 'free' : 'taken'))
        .catch(() => setTaken('unknown'))
    }, CHECK_MS)
    return () => clearTimeout(id)
  }, [name, trimmed, nameChanged])

  /**
   * 사진과 이름을 **한 번에** 보낸다.
   * 사진만 곧바로 반영하면 `저장` 을 안 누르고 나가도 얼굴은 이미 바뀌어 있어,
   * 이 화면에서 무엇이 확정된 것인지 알 수 없게 된다.
   */
  const save = useMutation({
    mutationFn: () => updateMe({
      ...(nameChanged ? { nickname: trimmed } : {}),
      ...(picked !== null ? { avatar: picked } : {}),
    }),
    onSuccess: (next) => {
      queryClient.setQueryData<Me>(qk.me, next)
      navigation.goBack()
    },
    onError: (e) => setError(errorMessage(e, '저장하지 못했어요')),
  })

  const dirty = nameChanged || picked !== null
  const canSave = dirty && badName === null && taken !== 'checking' && taken !== 'taken' && !save.isPending

  const change = async () => {
    const image = await pickImage()
    if (image) setCropping(image)
  }

  const hint = badName
    ?? (taken === 'checking' ? '확인 중…'
      : taken === 'taken' ? '이미 쓰는 닉네임이에요'
        : taken === 'free' ? '쓸 수 있어요'
          : '친구가 찾을 때 보이는 이름이에요')

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="뒤로">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.navTitle}>프로필 편집</Text>
        {/* 바뀐 게 없으면 누를 것도 없다 — 같은 값을 서버로 보낼 이유가 없다 */}
        <Pressable onPress={() => canSave && save.mutate()} disabled={!canSave} hitSlop={10}>
          {save.isPending
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Text style={[styles.save, !canSave && styles.saveOff]}>저장</Text>}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* 얼굴은 눌러도 되고 아래 글씨를 눌러도 된다 — 같은 일이라 둘을 한 덩이로 둔다 */}
          <Pressable style={styles.face} onPress={change} accessibilityLabel="프로필 사진 바꾸기">
            <Avatar name={me?.name ?? ''} uri={picked ?? me?.avatar} color={me?.color ?? colors.accent} size={88} />
            <Text style={styles.faceText}>사진 바꾸기</Text>
          </Pressable>

          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={(t) => { setError(null); setTyped(t.slice(0, NICKNAME_MAX)) }}
            placeholder="닉네임"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          <Text style={[
            s.hint,
            (badName !== null || taken === 'taken') && s.hintBad,
            badName === null && taken === 'free' && s.hintGood,
          ]}>
            {hint}
          </Text>

          {error !== null && <Text style={s.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <ImageCropper
        source={cropping}
        onCancel={() => setCropping(null)}
        onDone={(uri) => { setPicked(uri); setCropping(null) }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
  navTitle: { fontSize: text.title, fontWeight: '700', color: colors.ink },
  save: { fontSize: text.lead, fontWeight: '700', color: colors.accent },
  saveOff: { color: colors.faint },

  body: { paddingHorizontal: 16, paddingTop: space.lg, paddingBottom: 40 },
  face: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  faceText: { fontSize: text.small, fontWeight: '700', color: colors.accent },

  // 칸 위 이름표 — 안내 문구가 칸 아래에 있으므로 위아래가 한 덩이로 읽힌다
  label: { fontSize: text.caption, fontWeight: '700', color: colors.sub, marginBottom: space.sm, marginLeft: 4 },
})
