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
