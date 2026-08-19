import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as authApi from '@/api/auth'
import { errorMessage } from '@/api/error'
import AuthShell from '@/components/auth/AuthShell'
import CodeStep from '@/components/auth/CodeStep'
import PasswordPair from '@/components/auth/PasswordPair'
import LegalModal, { type LegalKind } from '@/components/legal/LegalModal'
import { useAuth } from '@/contexts/AuthContext'
import {
  NICKNAME_MAX, NICKNAME_MIN, confirmError, emailError, isNickname,
  nicknameError, passwordError,
} from '@/lib/authRules'
import { authStyles as s } from '@/screens/authStyles'
import { colors, text as type } from '@/theme'

/** 닉네임 중복 확인은 한 글자마다 때리지 않는다 */
const CHECK_MS = 400
/** 중복 확인 결과. `unknown` 은 서버가 답을 안 준 것 — 막지 않고 가입에서 판정한다 */
type Taken = 'idle' | 'checking' | 'free' | 'taken' | 'unknown'

/** 칸마다 따로 본다 — 어디가 틀렸는지 그 자리에서 말해주려면 한 덩이로 묶을 수 없다 */
type Field = 'email' | 'nickname' | 'password' | 'confirm' | 'agree'

/**
 * 회원가입 — **한 화면.**
 *
 * 한때 네 단계로 쪼갰는데 항목이 여섯 개뿐인데도 단계 라벨·뒤로·갈래별 submit 이 붙어
 * 장치가 내용보다 커졌다. 게다가 iOS 는 이메일과 새 비밀번호가 **같은 폼에서 함께 제출될 때**
 * 비로소 암호 저장을 제안한다 — 이 앱은 비밀번호를 잊으면 기록 전부에 못 들어가므로 그게 중요하다.
 *
 * **잘못은 한 글자 칠 때마다 그 칸 밑에서** 말한다. 버튼을 누른 뒤에야 알려주면
 * 어디를 고쳐야 하는지 찾으러 위로 되돌아가야 한다. 버튼 위 줄은 서버가 준 말만 쓴다.
 */
export default function RegisterScreen({ onDone }: { onDone: () => void }) {
  const { applySession } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  /** 버튼 위 한 줄 — 서버가 준 말과 흐름 문제만 */
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [taken, setTaken] = useState<Taken>('idle')
  /** 빈 칸인데도 말해줘야 하는 칸 — 안 채우고 버튼을 눌렀을 때 */
  const [reveal, setReveal] = useState<Partial<Record<Field, true>>>({})
  /** 열어 둔 문서. 동의만 받고 읽을 길이 없으면 무엇에 동의하는지 알 수 없다 */
  const [legal, setLegal] = useState<LegalKind | null>(null)
  const emailRef = useRef<TextInput>(null)
  const nickRef = useRef<TextInput>(null)

  /** 서버가 없거나 죽어 있으면 `unknown` 으로 두고 막지 않는다 — 최종 판정은 가입 요청이 한다 */
  useEffect(() => {
    if (!isNickname(nickname)) {
      setTaken('idle')
      return
    }
    setTaken('checking')
    const id = setTimeout(() => {
      authApi.checkNickname(nickname.trim())
        .then((free) => setTaken(free ? 'free' : 'taken'))
        .catch(() => setTaken('unknown'))
    }, CHECK_MS)
    return () => clearTimeout(id)
  }, [nickname])

  /*
    ── 칸별 판정 ──
    그릴 때마다 다시 센다. 상태로 들고 있으면 값이 바뀐 뒤에도 옛 오류가 남는다.
  */
  const errs: Record<Field, string | null> = {
    email: emailError(email),
    nickname: nicknameError(nickname) ?? (taken === 'taken' ? '이미 쓰는 닉네임이에요' : null),
    password: passwordError(password),
    confirm: confirmError(password, confirm),
    agree: agreed ? null : '이용약관과 개인정보 처리방침에 동의해 주세요',
  }
  /** 뭔가 쳐 넣은 칸. 동의는 칠 것이 없어 제출 때만 본다 */
  const filled: Record<Field, boolean> = {
    email: email !== '',
    nickname: nickname !== '',
    password: password !== '',
    confirm: confirm !== '',
    agree: false,
  }
  /**
   * **한 글자 칠 때마다** 다시 본다 — 칸을 떠날 때까지 기다리지 않는다.
   * 빈 칸만 예외다. 아직 안 쓴 것과 잘못 쓴 것은 다르고, 첫 글자를 치기도 전에 붉힐 일은 아니다.
   */
  const note = (f: Field) => (filled[f] || reveal[f] ? errs[f] : null)
  /** 고치는 중에 서버가 준 빨간 글씨가 남아 있으면 아직 막힌 줄 안다 → 손대면 지운다 */
  const edit = <T,>(set: (v: T) => void) => (v: T) => { setError(null); set(v) }

  const sendCode = async () => {
    // 코드를 받는 데 필요한 건 주소 하나뿐이다 — 나머지 빈 칸까지 붉히지 않는다
    setReveal((prev) => ({ ...prev, email: true }))
    if (errs.email) return emailRef.current?.focus()
    setSending(true)
    setError(null)
    try {
      await authApi.sendCode(email.trim())
      setSent(true)
    } catch (e) {
      setError(errorMessage(e, '인증 코드를 보내지 못했습니다'))
    } finally {
      setSending(false)
    }
  }

  /** 주소를 바꾸면 그 주소로 받은 확인은 없던 일이 된다 */
  const changeEmail = () => {
    setSent(false)
    setCode('')
    setVerified(false)
    setError(null)
  }

  const submit = async () => {
    if (busy) return
    // 여기서부터는 빈 칸도 말해준다 — 제출은 다 채웠다는 뜻이다
    setReveal({ email: true, nickname: true, password: true, confirm: true, agree: true })

    if (errs.email) return emailRef.current?.focus()
    if (!sent) return setError('이메일 인증 코드를 먼저 받아 주세요')
    if (!verified) return setError('이메일 확인을 마쳐 주세요')
    if (errs.nickname) return nickRef.current?.focus()
    // 비밀번호·동의는 버튼 바로 위라 굳이 옮겨주지 않아도 눈에 들어온다
    if (errs.password || errs.confirm || errs.agree) return

    setBusy(true)
    setError(null)
    try {
      await applySession(await authApi.register({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        code,
      }))
    } catch (e) {
      setError(errorMessage(e, '가입하지 못했습니다'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="회원가입"
      error={error}
      submitLabel="가입하기"
      canSubmit={!busy && taken !== 'checking'}
      busy={busy}
      onSubmit={submit}
      footer={
        <Pressable onPress={onDone} disabled={busy}>
          <Text style={s.link}>이미 계정이 있어요</Text>
        </Pressable>
      }
    >
      {/* 코드를 보낸 뒤에는 주소를 잠근다 — 주소를 바꿔놓고 옛 코드를 넣으면 왜 막히는지 알 수 없다 */}
      <View style={s.inputRow}>
        <TextInput
          ref={emailRef}
          style={s.inputFlex}
          value={email}
          onChangeText={edit(setEmail)}
          placeholder="이메일"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          /*
            `emailAddress` 가 아니라 `username`. iOS 는 `emailAddress` 칸에만
            `나의 이메일 가리기` 를 붙이고, 이미 만들어 둔 가림 주소가 있으면 **주소마다 하나씩** 붙인다.
            가림 주소로 가입하면 친구가 이메일로 나를 못 찾는다 — 닫힌 친구망에서는 그게 곧 빈 계정이다.
            `username` 도 계정 식별 칸이라 저장·자동완성은 그대로 되고, 그 제안만 빠진다
          */
          textContentType="username"
          editable={!sent}
          returnKeyType="send"
          onSubmitEditing={sendCode}
          autoFocus
        />
        {sent ? (
          <Pressable onPress={changeEmail} hitSlop={8}>
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

      {/* 보내기 전에는 채울 수 없다 → 보낸 뒤에 나타난다 */}
      {sent && (
        <CodeStep
          email={email.trim()}
          code={code}
          onChange={edit(setCode)}
          onResend={() => authApi.sendCode(email.trim())}
          busy={busy}
          /*
            **서버는 이 확인을 따로 요구한다** — `register` 는 넘긴 코드를 보지 않고
            `verifyCode` 가 세워둔 표시를 본다. 여기서 안 부르면 실서버 가입이 늘 막힌다
          */
          verify={(v) => authApi.verifyCode(email.trim(), v)}
          verified={verified}
          onVerified={setVerified}
        />
      )}

      <TextInput
        ref={nickRef}
        style={s.input}
        value={nickname}
        onChangeText={edit((t: string) => setNickname(t.slice(0, NICKNAME_MAX)))}
        placeholder={`닉네임 (${NICKNAME_MIN}~${NICKNAME_MAX}자)`}
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {/* 가입을 눌러보고서야 겹친 걸 아는 대신 여기서 미리 말해준다 */}
      <Text style={[
        s.hint,
        (note('nickname') !== null || taken === 'taken') && s.hintBad,
        note('nickname') === null && taken === 'free' && s.hintGood,
      ]}>
        {note('nickname')
          ?? (taken === 'checking' ? '확인 중…'
            : taken === 'taken' ? '이미 쓰는 닉네임이에요'
              : taken === 'free' ? '쓸 수 있어요'
                : '친구가 찾을 때 보이는 이름이에요')}
      </Text>

      <PasswordPair
        password={password}
        confirm={confirm}
        onPassword={edit(setPassword)}
        onConfirm={edit(setConfirm)}
        passwordNote={note('password')}
        confirmNote={note('confirm')}
      />

      {/* 남의 사진과 글을 주고받는 앱이라 동의 없이 가입시킬 수 없다 */}
      <View style={styles.agree}>
        <Pressable onPress={() => { setError(null); setAgreed((v) => !v) }} hitSlop={8}>
          <Ionicons
            name={agreed ? 'checkbox' : 'square-outline'}
            size={20}
            color={agreed ? colors.accent : note('agree') !== null ? colors.danger : colors.faint}
          />
        </Pressable>
        {/* 문서 이름만 눌린다 — 체크가 켜지고 꺼지는 것과 읽는 것은 다른 동작이다 */}
        <Text style={[styles.agreeText, note('agree') !== null && s.hintBad]}>
          <Text style={styles.legalLink} onPress={() => setLegal('terms')}>이용약관</Text>
          {'과 '}
          <Text style={styles.legalLink} onPress={() => setLegal('privacy')}>개인정보 처리방침</Text>
          {'에 동의합니다'}
        </Text>
      </View>

      <LegalModal kind={legal} onClose={() => setLegal(null)} />
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  /** 칸 안 오른쪽 손잡이 — `코드 받기` · `주소 바꾸기` */
  side: { fontSize: type.small, fontWeight: '700', color: colors.accent },

  agree: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginLeft: 4 },
  agreeText: { flex: 1, fontSize: type.small, lineHeight: 20, color: colors.sub },
  legalLink: { fontWeight: '700', color: colors.accent, textDecorationLine: 'underline' },
})
