import type { AuthResponse, LoginRequest, RegisterRequest, SendCodeRequest, VerifyCodeRequest } from '@buffett-diary/shared'
import client from './client'

export const authApi = {
  login(data: LoginRequest) {
    return client.post<AuthResponse>('/auth/login', data)
  },
  register(data: RegisterRequest) {
    return client.post<AuthResponse>('/auth/register', data)
  },
  sendCode(data: SendCodeRequest) {
    return client.post<{ message: string }>('/auth/send-code', data)
  },
  verifyCode(data: VerifyCodeRequest) {
    return client.post<{ message: string }>('/auth/verify-code', data)
  },
  checkNickname(nickname: string) {
    return client.get<{ available: boolean }>('/auth/check-nickname', { params: { nickname } })
  },
  logout() {
    const refreshToken = localStorage.getItem('refreshToken')
    return client.post('/auth/logout', { refreshToken })
  },
}
