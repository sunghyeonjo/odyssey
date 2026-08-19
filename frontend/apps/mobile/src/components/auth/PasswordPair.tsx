import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { PASSWORD_MAX, PASSWORD_MIN } from '@/lib/authRules'
import { authStyles as s } from '@/screens/authStyles'
import { colors } from '@/theme'

interface Props {
  password: string
  confirm: string
  onPassword: (v: string) => void
  onConfirm: (v: string) => void
  /** 띄울 말. `null` 이면 규칙 안내를 그대로 둔다 */
  passwordNote: string | null
  confirmNote: string | null
  /** 칸에 뜨는 이름. 비밀번호 변경 화면은 위에 `현재 비밀번호` 칸이 하나 더 있어 갈라 불러야 한다 */
  label?: string
}

/**
 * 비밀번호 + 확인 — 가입 · 재설정 · 변경이 **같은 것**을 쓴다.
 *
 * 확인 칸이 있어야 하는 이유: 이 앱에는 오타로 잠긴 계정을 스스로 여는 길이
 * 비밀번호 재설정 하나뿐이고, 그것도 메일을 받아야 한다.
 */
export default function PasswordPair({
  password, confirm, onPassword, onConfirm, passwordNote, confirmNote, label = '비밀번호',
}: Props) {
  const [show, setShow] = useState(false)

  return (
    <>
      <View style={s.inputRow}>
        <TextInput
          style={s.inputFlex}
          value={password}
          onChangeText={(t) => onPassword(t.slice(0, PASSWORD_MAX))}
          placeholder={label}
          placeholderTextColor={colors.faint}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          // 세 곳 다 '새로 정하는' 자리다 — iOS 가 여기서 암호 저장·강한 암호를 제안한다
          textContentType="newPassword"
        />
        {/* 가려진 칸에 오타를 내면 알 길이 없다 → 눌러서 확인한다 */}
        <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} accessibilityLabel={show ? '비밀번호 가리기' : '비밀번호 보기'}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.faint} />
        </Pressable>
      </View>

      {/* 규칙 안내와 오류가 **같은 자리**를 쓴다. 따로 두면 틀렸을 때 두 줄이 겹쳐 뜬다 */}
      <Text style={[s.hint, passwordNote !== null && s.hintBad]}>
        {passwordNote ?? `${PASSWORD_MIN}자 이상 · 영문·숫자·특수문자 중 2가지 이상`}
      </Text>

      <TextInput
        style={s.input}
        value={confirm}
        onChangeText={(t) => onConfirm(t.slice(0, PASSWORD_MAX))}
        placeholder={`${label} 확인`}
        placeholderTextColor={colors.faint}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
      />

      {/* 맞을 때도 말해준다 — 가려진 칸 둘을 비교하는 건 눈으로 할 수 없는 일이다 */}
      {(confirmNote !== null || confirm !== '') && (
        <Text style={[s.hint, confirmNote !== null ? s.hintBad : s.hintGood]}>
          {confirmNote ?? '비밀번호가 같아요'}
        </Text>
      )}
    </>
  )
}
