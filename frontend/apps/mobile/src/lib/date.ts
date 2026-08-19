/** 날짜 유틸 — 전부 로컬 타임존 기준. dateKey = "YYYY-MM-DD" */

export type DateKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export const keyOf = (d: Date): DateKey => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseKey = (k: DateKey): Date => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (k: DateKey, n: number): DateKey => {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return keyOf(d)
}
export const todayKey = (): DateKey => keyOf(new Date())

export const WEEK = ['일', '월', '화', '수', '목', '금', '토']

/** 달력 격자 — 1일이 오는 요일만큼 앞을 null 로 비운다 */
export function monthGrid(year: number, month: number): (DateKey | null)[] {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (DateKey | null)[] = []
  for (let i = 0; i < first.getDay(); i += 1) cells.push(null)
  for (let d = 1; d <= days; d += 1) cells.push(keyOf(new Date(year, month, d)))
  return cells
}

/** `8월 11일 화요일` — 목록·상세에서 하루를 부르는 이름 */
export const dayLabel = (k: DateKey): string => {
  const d = parseKey(k)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`
}

/** 댓글·게시물의 상대 시간. 하루가 넘어가면 날짜로 */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const min = Math.floor((Date.now() - then) / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  const d = new Date(then)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}
