import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@odyssey/shared'
import { USE_MOCK } from '@/config'
import { authMock } from './authMock'
import client from './client'

export async function login(request: LoginRequest) {
  if (USE_MOCK) return authMock.login(request.email, request.password)
  const { data } = await client.post<AuthResponse>('/auth/login', request)
  return data
}

export async function sendCode(email: string) {
  if (USE_MOCK) return authMock.sendCode(email)
  await client.post('/auth/send-code', { email })
}

export async function verifyCode(email: string, code: string) {
  if (USE_MOCK) return authMock.verifyCode(email, code)
  await client.post('/auth/verify-code', { email, code })
}

export async function checkNickname(nickname: string) {
  if (USE_MOCK) return authMock.checkNickname(nickname)
  const { data } = await client.get<{ available: boolean }>('/auth/check-nickname', {
    params: { nickname },
  })
  return data.available
}

export async function register(request: RegisterRequest) {
  if (USE_MOCK) return authMock.register(request)
  const { data } = await client.post<AuthResponse>('/auth/register', request)
  return data
}

/**
 * 비밀번호 재설정용 코드 받기 — **가입용(`sendCode`)과 다른 엔드포인트다.**
 *
 * 가입용은 "이미 쓰는 주소" 를 거부하므로 재설정에 쓰면 가입한 사람이 전부 막힌다.
 * 서버는 없는 주소여도 성공으로 답한다(계정 열거 방지) → 코드가 안 올 수도 있다.
 */
export async function sendPasswordResetCode(email: string) {
  if (USE_MOCK) return authMock.sendPasswordResetCode(email)
  await client.post('/auth/password/send-code', { email })
}

/** 새 비밀번호로 바꾼다. 성공하면 그 계정의 다른 세션은 서버가 전부 끊는다 */
export async function resetPassword(request: ResetPasswordRequest) {
  if (USE_MOCK) return authMock.resetPassword(request)
  await client.post('/auth/password/reset', request)
}

/**
 * 로그인한 채로 비밀번호 바꾸기 — 메일 코드 대신 **현재 비밀번호**로 확인한다.
 * 잊은 사람이 쓰는 `resetPassword` 와는 다른 길이다.
 */
export async function changePassword(request: ChangePasswordRequest) {
  if (USE_MOCK) return authMock.changePassword(request)
  await client.post('/auth/password/change', request)
}

export async function logout(refreshToken: string) {
  if (USE_MOCK) return authMock.logout()
  await client.post('/auth/logout', { refreshToken })
}
