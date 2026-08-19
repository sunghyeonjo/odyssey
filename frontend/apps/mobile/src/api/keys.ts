import type { DateKey } from '@/lib/date'

/** react-query 키 — 무효화 대상을 한곳에서 관리 */
export const qk = {
  me: ['me'] as const,
  stats: ['stats'] as const,
  allEntries: ['allEntries'] as const,
  blocked: ['blocked'] as const,
  month: (year: number, month: number) => ['month', year, month] as const,
  entry: (dateKey: DateKey) => ['entry', dateKey] as const,
  friends: ['friends'] as const,
  requests: ['requests'] as const,
  profile: (userId: number) => ['profile', userId] as const,
  search: (q: string) => ['search', q] as const,
  comments: (itemId: string) => ['comments', itemId] as const,
}
