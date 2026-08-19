import axios from 'axios'

/** 백엔드 GlobalExceptionHandler 는 항상 { message } 형태로 응답함 */
export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
    if (error.response === undefined) return '서버에 연결할 수 없습니다'
  }
  return fallback
}
