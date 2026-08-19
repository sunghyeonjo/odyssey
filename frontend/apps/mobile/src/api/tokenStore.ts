import type { User } from '@odyssey/shared'
import * as SecureStore from 'expo-secure-store'

const ACCESS_TOKEN = 'accessToken'
const REFRESH_TOKEN = 'refreshToken'
const USER = 'user'

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN)
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN)
}

export async function setTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN, refreshToken),
  ])
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN),
    SecureStore.deleteItemAsync(REFRESH_TOKEN),
    SecureStore.deleteItemAsync(USER),
  ])
}

/**
 * 로그인 시 받은 프로필을 함께 저장함.
 * 백엔드에 현재 유저를 돌려주는 엔드포인트가 없어서, 앱 재시작 시 이 값으로 복원함.
 */
export async function setUser(user: User) {
  await SecureStore.setItemAsync(USER, JSON.stringify(user))
}

export async function getUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}
