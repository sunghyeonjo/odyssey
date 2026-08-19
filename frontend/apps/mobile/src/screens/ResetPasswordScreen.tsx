import { Ionicons } from '@expo/vector-icons'
import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as authApi from '@/api/auth'
import { errorMessage } from '@/api/error'
import AuthShell from '@/components/auth/AuthShell'
import CodeStep from '@/components/auth/CodeStep'
import PasswordPair from '@/components/auth/PasswordPair'
import { codeError, confirmError, emailError, passwordError } from '@/lib/authRules'
import { authStyles as s } from '@/screens/authStyles'
import { colors, text as type } from '@/theme'

type Field = 'email' | 'password' | 'confirm'

/**
 * 비밀번호 찾기 — 가입과 **같은 한 화면 짜임**.
 *
 * 이 앱은 비밀번호가 유일한 열쇠라 잊으면 계정과 그동안의 기록 전부에 못 들어간다.
 * 가입 때 쓴 코드 흐름을 그대로 재사용한다 — 새 개념을 하나 더 배우게 하지 않는다.
 *
 * 다만 코드를 **미리 확인하지는 못한다.** 재설정 코드는 맞춰보는 순간 서버가 지우기 때문에
 * 미리 물어보면 정작 바꿀 때 쓸 코드가 없다. 판정은 `비밀번호 바꾸기` 한 번에 일어난다.
 */
export default function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** 빈 칸인데도 말해줘야 하는 칸 — 안 채우고 버튼을 눌렀을 때 */
  const [reveal, setReveal] = useState<Partial<Record<Field, true>>>({})
  const emailRef = useRef<TextInput>(null)

  const errs: Record<Field, string | null> = {
    email: emailError(email),
    password: passwordError(password),
    confirm: confirmError(password, confirm),
  }
  const filled: Record<Field, boolean> = { email: email !== '', password: password !== '', confirm: confirm !== '' }
  /** 가입 화면과 같다 — **한 글자 칠 때마다.** 빈 칸만 제출까지 기다린다 */
  const note = (f: Field) => (filled[f] || reveal[f] ? errs[f] : null)
  const edit = <T,>(set: (v: T) => void) => (v: T) => { setError(null); set(v) }

  const sendCode = async () => {
    setReveal((prev) => ({ ...prev, email: true }))
    if (errs.email) return emailRef.current?.focus()
    setSending(true)
    setError(null)
    try {
      await authApi.sendPasswordResetCode(email.trim())
      setSent(true)
    } catch (e) {
      setError(errorMessage(e, '인증 코드를 보내지 못했습니다'))
    } finally {
      setSending(false)
    }
  }

  const submit = async () => {
    if (done) return onDone()
    if (busy) return
    setReveal({ email: true, password: true, confirm: true })

    if (errs.email) return emailRef.current?.focus()
    if (!sent) return setError('이메일 인증 코드를 먼저 받아 주세요')
    const badCode = codeError(code)
    if (badCode) return setError(badCode)
    if (errs.password || errs.confirm) return

    setBusy(true)
    setError(null)
    try {
      await authApi.resetPassword({ email: email.trim(), code, newPassword: password })
      setDone(true)
    } catch (e) {
      setError(errorMessage(e, '비밀번호를 바꾸지 못했습니다'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title={done ? '' : '비밀번호 찾기'}
      error={error}
      submitLabel={done ? '로그인하기' : '비밀번호 바꾸기'}
      canSubmit={!busy}
      busy={busy}
      onSubmit={submit}
      // 다 끝난 뒤에는 갈 곳이 하나뿐이라 링크를 안 둔다
      footer={done ? undefined : (
        <Pressable onPress={onDone} disabled={busy}>
          <Text style={s.link}>로그인으로 돌아가기</Text>
        </Pressable>
      )}
    >
      {done ? (
        <View style={styles.done}>
          <Ionicons name="checkmark-circle" size={44} color={colors.ok} />
          <Text style={styles.doneTitle}>비밀번호를 바꿨어요</Text>
          <Text style={styles.doneText}>새 비밀번호로 로그인하세요</Text>
        </View>
      ) : (
        <>
          {/* 코드를 보낸 뒤에는 주소를 잠근다 — 주소를 바꿔놓고 옛 코드를 넣으면 왜 막히는지 알 수 없다 */}
          <View style={s.inputRow}>
            <TextInput
              ref={emailRef}
              style={s.inputFlex}
              value={email}
              onChangeText={edit(setEmail)}
              placeholder="가입할 때 쓴 이메일"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              // 가입 화면과 같은 이유로 `username` — RegisterScreen 의 주석 참고
              textContentType="username"
              editable={!sent}
              returnKeyType="send"
              onSubmitEditing={sendCode}
              autoFocus
            />
            {sent ? (
              <Pressable onPress={() => { setSent(false); setCode(''); setError(null) }} hitSlop={8}>
                <Text style={styles.side}>주소 바꾸기</Text>
              </Pressable>
            ) : (
              <Pressable onPress={sendCode} disabled={sending} hitSlop={8}>
                {sending
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <Text style={styles.side}>코드 받기</Text>}
              </Pressable>
            )}
          </View>
          {note('email') !== null && <Text style={[s.hint, s.hintBad]}>{note('email')}</Text>}

          {sent && (
            <CodeStep
              email={email.trim()}
              code={code}
              onChange={edit(setCode)}
              onResend={() => authApi.sendPasswordResetCode(email.trim())}
              busy={busy}
            />
          )}

          <PasswordPair
            password={password}
            confirm={confirm}
            onPassword={edit(setPassword)}
            onConfirm={edit(setConfirm)}
            passwordNote={note('password')}
            confirmNote={note('confirm')}
          />
        </>
      )}
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  side: { fontSize: type.small, fontWeight: '700', color: colors.accent },

  done: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  doneTitle: { fontSize: type.title, fontWeight: '800', color: colors.ink, marginTop: 4 },
  doneText: { fontSize: type.body, color: colors.sub },
})
