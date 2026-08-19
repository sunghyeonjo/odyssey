import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { authStyles as s } from '@/screens/authStyles'

interface Props {
  /** 빈 문자열이면 안 그린다 (다 끝난 화면) */
  title: string
  error?: string | null
  submitLabel: string
  canSubmit: boolean
  busy: boolean
  onSubmit: () => void
  /** 맨 아래 링크들 */
  footer?: ReactNode
  children: ReactNode
}

/**
 * 가입·재설정 화면의 **공통 뼈대** — 제목 · 입력칸 · 오류 · 버튼 · 링크.
 *
 * 두 화면이 같은 짜임을 각자 들고 있으면 한쪽만 고쳐져 어긋난다.
 * 실제로 이 앱의 다른 곳에서 그렇게 어긋났었다.
 *
 * 단계 표시와 뒤로 버튼이 있었는데 둘 다 없앴다 — 두 화면 모두 한 페이지가 되면서
 * 넘길 단계도, 되돌아갈 앞 단계도 사라졌다.
 */
export default function AuthShell({
  title, error, submitLabel, canSubmit, busy, onSubmit, footer, children,
}: Props) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.inner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!!title && <Text style={[s.title, s.titleOnly]}>{title}</Text>}

        {children}

        {!!error && <Text style={s.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [s.button, !canSubmit && s.buttonDisabled, pressed && canSubmit && s.buttonPressed]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{submitLabel}</Text>}
        </Pressable>

        {footer && <View style={s.footer}>{footer}</View>}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
