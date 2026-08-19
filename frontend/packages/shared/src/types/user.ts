export interface User {
  id: number
  email: string
  nickname: string
  bio: string | null
  createdAt: string
}

export interface UpdateProfileRequest {
  bio?: string | null
  nickname?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  nickname: string
  code: string
}

export interface SendCodeRequest {
  email: string
}

export interface VerifyCodeRequest {
  email: string
  code: string
}

/**
 * 비밀번호 재설정 — `POST /api/v1/auth/password/reset` → 204.
 *
 * 코드는 `POST /api/v1/auth/password/send-code` 로 따로 받는다.
 * 가입용 `send-code` 는 **이미 있는 주소를 거부**하므로 재설정에 쓸 수 없다.
 */
export interface ResetPasswordRequest {
  email: string
  code: string
  newPassword: string
}

/**
 * 로그인한 채로 비밀번호 바꾸기 — `POST /api/v1/auth/password/change` → 204.
 *
 * 재설정(`ResetPasswordRequest`)과 갈라 둔다. 그쪽은 **비밀번호를 잊은 사람**이 메일 코드로
 * 본인을 증명하는 길이고, 이쪽은 **아는 사람**이 현재 비밀번호로 증명하는 길이다.
 * 성공하면 이 기기 말고 다른 세션은 서버가 전부 끊는다.
 */
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
