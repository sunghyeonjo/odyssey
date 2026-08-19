import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { errorMessage } from '@/api/error'
import { USE_MOCK } from '@/config'
import { CODE_LEN, cleanCode } from '@/lib/authRules'
import { authStyles as s } from '@/screens/authStyles'
import { colors, space, text as type } from '@/theme'

/** 재전송까지 기다리는 초. 메일이 늦게 오는 경우가 있어 너무 길면 갇힌다 */
const COOLDOWN = 60

interface Props {
  email: string
  code: string
  onChange: (v: string) => void
  /** 코드 다시 보내기. 실패하면 부르는 쪽이 오류를 띄운다 */
  onResend: () => Promise<void>
  busy: boolean
  /**
   * 여섯 자리가 채워지는 순간 서버에 물어본다 — 통과하면 `onVerified(true)`.
   *
   * 비밀번호 재설정에는 **없다.** 그쪽 코드는 확인이 곧 소모라(서버가 맞춰보면서 지운다)
   * 미리 물어보면 정작 바꿀 때 쓸 코드가 없어진다. 그래서 제출할 때 한 번에 판정한다.
   */
  verify?: (code: string) => Promise<void>
  verified?: boolean
  onVerified?: (v: boolean) => void
}

/**
 * 여섯 자리 인증 코드 — 가입과 비밀번호 재설정이 **같은 것**을 쓴다.
 *
 * **다 채우면 스스로 확인하고 접힌다.** 확인 버튼을 따로 두면 여섯 자리를 다 넣고도
 * 한 번 더 눌러야 하고, 재전송 시계는 이미 끝난 일 옆에서 계속 돌아간다.
 */
export default function CodeStep({
  email, code, onChange, onResend, busy, verify, verified = false, onVerified,
}: Props) {
  const [left, setLeft] = useState(COOLDOWN)
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [bad, setBad] = useState<string | null>(null)
  const full = code.length === CODE_LEN

  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((v) => v - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  /*
    여섯 자리가 채워지는 순간 확인한다.
    `verify` · `onVerified` 는 부를 때마다 새로 만들어지는 함수라 지켜보는 값에서 뺐다 —
    넣으면 확인이 끝나고 다시 그려질 때 또 확인하러 간다.
  */
  useEffect(() => {
    if (!verify || verified || !full) return
    let alive = true
    setChecking(true)
    setBad(null)
    verify(code)
      .then(() => { if (alive) onVerified?.(true) })
      .catch((e) => { if (alive) setBad(errorMessage(e, '코드가 올바르지 않아요')) })
      .finally(() => { if (alive) setChecking(false) })
    return () => { alive = false }
  }, [code, full, verified])

  const resend = async () => {
    if (left > 0 || sending) return
    setSending(true)
    setBad(null)
    try {
      await onResend()
      setLeft(COOLDOWN)
    } finally {
      setSending(false)
    }
  }

  // 확인이 끝났으면 칸도 시계도 없앤다. 다 쓴 코드를 계속 보여줄 이유가 없다
  if (verified) {
    return (
      <View style={styles.done}>
        <Ionicons name="checkmark-circle" size={18} color={colors.ok} />
        <Text style={styles.doneText}>이메일을 확인했어요</Text>
      </View>
    )
  }

  return (
    <>
      <Text style={s.hint}>
        {USE_MOCK
          ? `개발 모드 — 아무 ${CODE_LEN}자리 숫자나 통과합니다`
          : `${email} 으로 보낸 ${CODE_LEN}자리 코드를 입력하세요`}
      </Text>
      <TextInput
        style={[s.input, s.codeInput]}
        value={code}
        onChangeText={(t) => { setBad(null); onChange(cleanCode(t)) }}
        placeholder="000000"
        placeholderTextColor={colors.faint}
        keyboardType="number-pad"
        maxLength={CODE_LEN}
        editable={!checking}
        // iOS 가 메일에서 코드를 읽어 키보드 위에 띄워준다
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
      />

      {checking && <Text style={s.hint}>확인 중…</Text>}
      {bad !== null && <Text style={[s.hint, s.hintBad]}>{bad}</Text>}

      {/*
        다 채우고 나면 재전송 줄을 접는다 — 이제 할 일은 코드를 다시 받는 게 아니다.
        틀렸을 때는 되살린다. 그때는 정말 다시 받아야 할 수도 있다
      */}
      {(!full || bad !== null) && !checking && (
        <View style={styles.row}>
          <Pressable onPress={resend} disabled={left > 0 || sending || busy} hitSlop={8}>
            <Text style={[styles.resend, left > 0 && styles.resendOff]}>
              {sending ? '보내는 중…' : left > 0 ? `코드 다시 받기 (${left}초)` : '코드 다시 받기'}
            </Text>
          </Pressable>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', marginTop: 4 },
  resend: { fontSize: type.body, fontWeight: '700', color: colors.accent },
  resendOff: { color: colors.faint, fontWeight: '400' },

  done: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md, marginLeft: 4 },
  doneText: { fontSize: type.body, fontWeight: '700', color: colors.ok },
})
