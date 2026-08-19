import type { QueryClient } from '@tanstack/react-query'
import { qk } from '@/api/keys'
import type { Entry } from '@/api/types'
import { parseKey, type DateKey } from '@/lib/date'

/**
 * 내 기록 한 건을 캐시 **두 곳에서 함께** 고친다 —
 * 달력이 보는 달 목록(`month`)과 상세가 보는 전체 목록(`allEntries`).
 *
 * 한쪽만 고치면 달력의 자물쇠 도장과 상세의 알약이 서로 다른 말을 한다.
 * 서버 응답을 기다렸다 고치면 눌러도 한참 아무 일이 없어 "안 바뀌었다" 로 읽힌다.
 */
export const patchEntry = (qc: QueryClient, dateKey: DateKey, patch: (e: Entry) => Entry) => {
  const d = parseKey(dateKey)
  const apply = (list: Entry[] | undefined) => list?.map((e) => (e.dateKey === dateKey ? patch(e) : e))
  qc.setQueryData<Entry[]>(qk.month(d.getFullYear(), d.getMonth()), apply)
  qc.setQueryData<Entry[]>(qk.allEntries, apply)
  // 홈은 달력을 안 들고 있어 그날 하나만 따로 본다 — 여기도 같이 고쳐야 홈이 안 뒤처진다
  qc.setQueryData<Entry | null>(qk.entry(dateKey), (e) => (e ? patch(e) : e))
}

/** 하트 한 번 — 켜고 끄는 것과 숫자를 늘 같이 움직인다 */
export const toggleLikeOn = (e: Entry): Entry => ({
  ...e,
  likedByMe: !e.likedByMe,
  likeCount: Math.max(0, (e.likeCount ?? 0) + (e.likedByMe ? -1 : 1)),
})
