import { Ionicons } from '@expo/vector-icons'
import { useRef, useState } from 'react'
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { errorMessage } from '@/api/error'
import { START_AT_LOGIN } from '@/config'
import { useAuth } from '@/contexts/AuthContext'
import { PASSWORD_MAX, emailError } from '@/lib/authRules'
import { colors, text as type } from '@/theme'
import { authStyles as s } from './authStyles'

interface Props {
  onRegister: () => void
  onForgot: () => void
}

export default function LoginScreen({ onRegister, onForgot }: Props) {
  const { signIn, devSignIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const pwRef = useRef<TextInput>(null)
  const insets = useSafeAreaInsets()

  /** 손대면 오류를 지운다 — 고치는 중에 빨간 글씨가 남으면 아직 틀린 줄 안다 */
  const edit = <T,>(set: (v: T) => void) => (v: T) => { setError(null); set(v) }

  /**
   * **버튼은 늘 눌린다.** 회색으로 죽여두면 왜 안 되는지 알 길이 없다.
   * 형식이 틀린 주소를 서버까지 보내봐야 400 을 받을 뿐이라 여기서 먼저 말해준다.
   */
  async function handleSubmit() {
    if (submitting) return
    const bad = emailError(email) ?? (password === '' ? '비밀번호를 입력해 주세요' : null)
    if (bad) return setError(bad)
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (e) {
      setError(errorMessage(e, '이메일 또는 비밀번호를 확인해 주세요'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 개발용 지름길 — 서버 없이 내 계정으로. 릴리스 빌드에는 안 들어간다 */}
      {START_AT_LOGIN && (
        <SafeAreaView style={s.devWrap} edges={['top']} pointerEvents="box-none">
          <Pressable style={s.devBtn} onPress={devSignIn} hitSlop={8}>
            <Text style={s.devText}>바로 들어가기</Text>
          </Pressable>
        </SafeAreaView>
      )}

      <ScrollView
        contentContainerStyle={[s.inner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Dayed</Text>
        <Text style={s.subtitle}>하루 한 컷, 오늘의 기록</Text>

        <TextInput
          style={s.input}
          value={email}
          onChangeText={edit(setEmail)}
          placeholder="이메일"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          // 가입과 같은 값이어야 iOS 가 저장해 둔 계정을 여기서 찾아 채워준다
          textContentType="username"
          // 다음 칸으로 손이 아니라 키보드가 넘겨준다
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
          // 비밀번호 칸으로 넘어가는 순간 형식을 봐준다. 빈 칸은 아직 나무라지 않는다
          onBlur={() => { if (email.trim() !== '') setError(emailError(email)) }}
        />

        <View style={s.inputRow}>
          <TextInput
            ref={pwRef}
            style={s.inputFlex}
            value={password}
            onChangeText={edit((t: string) => setPassword(t.slice(0, PASSWORD_MAX)))}
            placeholder="비밀번호"
            placeholderTextColor={colors.faint}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          <Pressable
            onPress={() => setShow((v) => !v)}
            hitSlop={10}
            accessibilityLabel={show ? '비밀번호 가리기' : '비밀번호 보기'}
          >
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.faint} />
          </Pressable>
        </View>

        {error !== null && <Text style={s.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            s.button,
            submitting && s.buttonDisabled,
            pressed && !submitting && s.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>로그인</Text>
          )}
        </Pressable>

        {/*
          비밀번호를 잊으면 계정과 그동안의 기록 전부에 못 들어간다 →
          로그인 실패가 잦은 자리 바로 아래에 길을 둔다
        */}
        <View style={styles.links}>
          <Pressable onPress={onForgot} disabled={submitting} hitSlop={8}>
            <Text style={s.link}>비밀번호 찾기</Text>
          </Pressable>
          <Text style={styles.sep}>·</Text>
          <Pressable onPress={onRegister} disabled={submitting} hitSlop={8}>
            <Text style={s.link}>회원가입</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 },
  sep: { color: colors.faint, fontSize: type.body },
})
