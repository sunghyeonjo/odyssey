import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import { errorMessage } from '@/api/error'
import PasswordPair from '@/components/auth/PasswordPair'
import { PASSWORD_MAX, confirmError, passwordError } from '@/lib/authRules'
import { authStyles as s } from '@/screens/authStyles'
import { colors, space, text } from '@/theme'

type Field = 'current' | 'password' | 'confirm'

/**
 * 비밀번호 변경 — **아는 사람이 바꾸는 길.**
 *
 * 잊은 사람은 로그인 화면의 `비밀번호 찾기` 로 간다(메일 코드). 둘을 갈라 두는 이유는
 * 여기서는 메일함까지 갈 필요가 없고, 남이 잠깐 내 폰을 집어 들어도 현재 비밀번호에서 막히기 때문이다.
 *
 * 판정은 가입·재설정과 **같은 규칙**(`lib/authRules`)이고, 새 비밀번호 칸도 같은 부품을 쓴다.
 */
export default function ChangePasswordScreen() {
  const navigation = useNavigation<any>()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** 빈 칸인데도 말해줘야 하는 칸 — 안 채우고 버튼을 눌렀을 때 */
  const [reveal, setReveal] = useState<Partial<Record<Field, true>>>({})

  /*
    현재 비밀번호는 **형식을 안 본다.** 예전에 정한 것이라 지금 규칙에 안 맞을 수도 있고,
    맞는지 아닌지는 서버만 안다. 여기서는 비었는지만 본다
  */
  const errs: Record<Field, string | null> = {
    current: current === '' ? '현재 비밀번호를 입력해 주세요' : null,
    password: passwordError(password),
    confirm: confirmError(password, confirm),
  }
  const filled: Record<Field, boolean> = {
    current: current !== '',
    password: password !== '',
    confirm: confirm !== '',
  }
  /** 가입 화면과 같다 — **한 글자 칠 때마다.** 빈 칸만 제출까지 기다린다 */
  const note = (f: Field) => (filled[f] || reveal[f] ? errs[f] : null)
  const edit = <T,>(set: (v: T) => void) => (v: T) => { setError(null); set(v) }

  const submit = async () => {
    if (busy) return
    setReveal({ current: true, password: true, confirm: true })
    if (errs.current || errs.password || errs.confirm) return

    setBusy(true)
    setError(null)
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: password })
      // 이 기기는 그대로 이어간다 — 끊기는 건 다른 기기의 세션이고, 그건 서버가 한다
      Alert.alert('비밀번호를 바꿨어요', '다른 기기에서는 다시 로그인해야 해요')
      navigation.goBack()
    } catch (e) {
      setError(errorMessage(e, '비밀번호를 바꾸지 못했습니다'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="뒤로">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.navTitle}>비밀번호 변경</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>현재 비밀번호</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.inputFlex}
              value={current}
              onChangeText={edit((t: string) => setCurrent(t.slice(0, PASSWORD_MAX)))}
              placeholder="현재 비밀번호"
              placeholderTextColor={colors.faint}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              // 새로 정하는 칸이 아니다 → 저장해둔 지금 암호를 채워준다
              textContentType="password"
              autoFocus
            />
            <Pressable
              onPress={() => setShow((v) => !v)}
              hitSlop={10}
              accessibilityLabel={show ? '비밀번호 가리기' : '비밀번호 보기'}
            >
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.faint} />
            </Pressable>
          </View>
          <Text style={[s.hint, note('current') !== null && s.hintBad]}>
            {note('current') ?? '지금 쓰고 있는 비밀번호예요'}
          </Text>

          <Text style={styles.label}>새 비밀번호</Text>
          <PasswordPair
            label="새 비밀번호"
            password={password}
            confirm={confirm}
            onPassword={edit(setPassword)}
            onConfirm={edit(setConfirm)}
            passwordNote={note('password')}
            confirmNote={note('confirm')}
          />

          {error !== null && <Text style={s.error}>{error}</Text>}

          {/* 로그인 화면과 같은 규칙 — **버튼은 늘 눌린다.** 회색으로 죽여두면 왜 안 되는지 알 수 없다 */}
          <Pressable
            style={({ pressed }) => [s.button, busy && s.buttonDisabled, pressed && !busy && s.buttonPressed]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>바꾸기</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
  navTitle: { fontSize: text.title, fontWeight: '700', color: colors.ink },

  body: { paddingHorizontal: 16, paddingTop: space.lg, paddingBottom: 40 },
  // 칸 묶음 위 이름표 — 두 묶음이 무엇으로 갈리는지 여기서만 말한다
  label: { fontSize: text.caption, fontWeight: '700', color: colors.sub, marginBottom: space.sm, marginTop: space.md, marginLeft: 4 },
})
