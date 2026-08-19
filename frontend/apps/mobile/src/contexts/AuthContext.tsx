import type { AuthResponse, User } from '@odyssey/shared'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '@/api/auth'
import { MOCK_SESSION } from '@/api/authMock'
import { setOnSessionExpired } from '@/api/client'
import { START_AT_LOGIN } from '@/config'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getUser as getStoredUser,
  setTokens,
  setUser as storeUser,
} from '@/api/tokenStore'

interface AuthState {
  user: User | null
  /** 저장된 토큰을 읽어오는 동안 true — 스플래시를 유지할지 판단하는 데 씀 */
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  /** 회원가입처럼 로그인 외의 경로로 받은 세션을 적용함 */
  applySession: (auth: AuthResponse) => Promise<void>
  signOut: () => Promise<void>
  /** 개발용 — 서버 없이 내 계정으로 들어감 */
  devSignIn: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken()
    if (refreshToken) {
      // 서버 로그아웃이 실패해도 로컬 토큰은 지워야 함
      await authApi.logout(refreshToken).catch(() => undefined)
    }
    await clearTokens()
    setUser(null)
  }, [])

  useEffect(() => {
    // 갱신까지 실패했을 때 인터셉터가 알려주면 로그인 화면으로 되돌림
    setOnSessionExpired(() => setUser(null))
    return () => setOnSessionExpired(null)
  }, [])

  useEffect(() => {
    // 개발 중에는 복원하지 않고 로그인 화면부터 시작함 (config.START_AT_LOGIN)
    if (START_AT_LOGIN) {
      setLoading(false)
      return
    }
    let cancelled = false
    // 토큰이 만료됐더라도 인터셉터가 갱신하므로 여기서는 저장된 세션만 복원함.
    // 갱신까지 실패하면 setOnSessionExpired 로 로그인 화면으로 되돌아감.
    Promise.all([getAccessToken(), getStoredUser()])
      .then(([token, storedUser]) => {
        if (!cancelled && token && storedUser) setUser(storedUser)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const applySession = useCallback(async (auth: AuthResponse) => {
    await setTokens(auth.accessToken, auth.refreshToken)
    await storeUser(auth.user)
    setUser(auth.user)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      await applySession(await authApi.login({ email, password }))
    },
    [applySession],
  )

  /*
    개발용 지름길 — 목업 로그인이 돌려주는 것과 **같은 세션**을 쓴다.
    여기서 사용자를 따로 지어내면 목업의 `me`(성현·id 1)와 어긋나 화면마다 다른 사람이 된다.
    실서버에 붙으면 이 토큰이 401 → 갱신 실패 → 로그인 화면으로 스스로 정리된다
  */
  const devSignIn = useCallback(() => applySession(MOCK_SESSION), [applySession])

  const value = useMemo<AuthState>(
    () => ({ user, loading, signIn, applySession, signOut, devSignIn }),
    [user, loading, signIn, applySession, signOut, devSignIn],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있습니다')
  return context
}
