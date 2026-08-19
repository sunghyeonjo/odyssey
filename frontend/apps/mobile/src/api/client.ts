import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStore'

/*
  주소가 없어도 **모듈을 읽는 시점에는 터지지 않는다.**
  목업만 쓰는 동안에도 이 파일은 import 되므로, 여기서 throw 하면 `.env` 없이는 앱이 아예 안 뜬다.
  실제로 요청을 보낼 때 알려준다.
*/
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
const API_BASE = `${BASE_URL ?? ''}/api/v1`

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

/** 토큰이 완전히 만료되어 재로그인이 필요할 때 호출됨. AuthContext 가 등록함 */
let onSessionExpired: (() => void) | null = null
export function setOnSessionExpired(handler: (() => void) | null) {
  onSessionExpired = handler
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

client.interceptors.request.use(async (config) => {
  if (!BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL 이 설정되지 않았습니다. apps/mobile/.env 를 확인하세요.')
  }
  const token = await getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * 진행 중인 갱신 요청.
 *
 * 백엔드는 refresh 시 기존 토큰을 삭제하고 새로 발급함(회전).
 * 앱 실행 직후처럼 여러 요청이 동시에 401 을 받으면 각자 refresh 를 호출하게 되는데,
 * 먼저 도착한 쪽이 토큰을 지워버려 나머지가 전부 실패하고 로그아웃됨.
 * 그래서 갱신은 한 번만 수행하고 나머지는 그 결과를 기다림.
 */
let refreshInFlight: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) throw new Error('no refresh token')

  const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
  await setTokens(data.accessToken, data.refreshToken)
  return data.accessToken
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const status = error.response?.status

    if (!original || original._retry || (status !== 401 && status !== 403)) {
      return Promise.reject(error)
    }
    original._retry = true

    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null
      })
    }

    try {
      const accessToken = await refreshInFlight
      original.headers.Authorization = `Bearer ${accessToken}`
      return client(original)
    } catch {
      await clearTokens()
      onSessionExpired?.()
      return Promise.reject(error)
    }
  },
)

export default client
