import { NavigationContainer } from '@react-navigation/native'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import AppNavigator from '@/navigation/AppNavigator'
import LoginScreen from '@/screens/LoginScreen'
import RegisterScreen from '@/screens/RegisterScreen'
import ResetPasswordScreen from '@/screens/ResetPasswordScreen'
import { colors } from '@/theme'

/**
 * 로그인 전 화면 셋. 스택을 안 쓰는 이유 —
 * 이 셋은 서로를 밀어 올리는 관계가 아니라 **하나만 서 있는** 관계다.
 * 어디서 끝나든 돌아갈 곳은 로그인 하나뿐이다.
 */
type Gate = 'login' | 'register' | 'forgot'

export default function RootNavigator() {
  const { user, loading } = useAuth()
  const [gate, setGate] = useState<Gate>('login')

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  const toLogin = () => setGate('login')

  return (
    <NavigationContainer>
      {user !== null ? (
        <AppNavigator />
      ) : gate === 'register' ? (
        <RegisterScreen onDone={toLogin} />
      ) : gate === 'forgot' ? (
        <ResetPasswordScreen onDone={toLogin} />
      ) : (
        <LoginScreen onRegister={() => setGate('register')} onForgot={() => setGate('forgot')} />
      )}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
})
