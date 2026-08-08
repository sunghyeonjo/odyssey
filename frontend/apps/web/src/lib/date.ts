import dayjs from 'dayjs'

/** 2026년 03월 01일 */
export function formatDate(value: string | Date): string {
  return dayjs(value).format('YYYY년 MM월 DD일')
}

/** 2026년 03월 01일 14시 30분 */
export function formatDateTime(value: string | Date): string {
  return dayjs(value).format('YYYY년 MM월 DD일 HH시 mm분')
}

/** dayjs 인스턴스를 API 파라미터용 YYYY-MM-DD 문자열로 변환 */
export function toDateString(d: dayjs.Dayjs): string {
  return d.format('YYYY-MM-DD')
}
