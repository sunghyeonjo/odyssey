/**
 * Dayed API 레이어.
 *
 * 인메모리 목업 / 실서버 전환은 `config.USE_MOCK` 하나가 정한다 — 인증(`auth.ts`)과 같은 스위치다.
 * 컴포넌트는 이 함수들만 알면 됨.
 */
import { USE_MOCK } from '@/config'
import type { DateKey } from '@/lib/date'
import client from './client'
import { mock } from './mock'
import type {
  Comment,
  CreateEntryInput,
  Entry,
  Me,
  Profile,
  ReportReason,
  Stats,
  UpdateMePatch,
  UserCard,
  Visibility,
} from './types'

export const getMe = (): Promise<Me> =>
  USE_MOCK ? mock.getMe() : client.get<Me>('/me').then((r) => r.data)

/** 프로필 고치기 — 넘긴 것만 바뀐다. 닉네임이 겹치면 서버가 막는다 */
export const updateMe = (patch: UpdateMePatch): Promise<Me> =>
  USE_MOCK ? mock.updateMe(patch) : client.patch<Me>('/me', patch).then((r) => r.data)

export const getStats = (): Promise<Stats> =>
  USE_MOCK ? mock.getStats() : client.get<Stats>('/stats').then((r) => r.data)

export const getMonthEntries = (year: number, month: number): Promise<Entry[]> =>
  USE_MOCK
    ? mock.getMonthEntries(year, month)
    : client.get<Entry[]>('/entries', { params: { year, month: month + 1 } }).then((r) => r.data)

export const getEntry = (dateKey: DateKey): Promise<Entry | null> =>
  USE_MOCK ? mock.getEntry(dateKey) : client.get<Entry>(`/entries/${dateKey}`).then((r) => r.data)

export const getAllEntries = (): Promise<Entry[]> =>
  USE_MOCK ? mock.getAllEntries() : client.get<Entry[]>('/entries/all').then((r) => r.data)

export const createEntry = (input: CreateEntryInput): Promise<Entry> =>
  USE_MOCK ? mock.createEntry(input) : client.put<Entry>(`/entries/${input.dateKey}`, input).then((r) => r.data)

/** 그날 기록을 통째로 지운다. 받은 반응도 함께 사라진다 */
export const deleteEntry = (dateKey: DateKey): Promise<void> =>
  USE_MOCK ? mock.deleteEntry(dateKey) : client.delete(`/entries/${dateKey}`).then(() => undefined)

/**
 * 공개 범위만 갈아끼운다. 사진·글은 건드리지 않는다.
 * 통짜 PUT 으로 공개만 바꾸면 사진·글까지 다시 보내게 되어, 다른 기기에서 수정 중이면 덮어쓴다.
 */
export const updateVisibility = (dateKey: DateKey, visibility: Visibility): Promise<Entry> =>
  USE_MOCK
    ? mock.updateVisibility(dateKey, visibility)
    : client.put<Entry>(`/entries/${dateKey}/visibility`, { visibility }).then((r) => r.data)

export const getFriends = (): Promise<UserCard[]> =>
  USE_MOCK ? mock.getFriends() : client.get<UserCard[]>('/friends').then((r) => r.data)

/** 나에게 온 친구 요청 */
export const getRequests = (): Promise<UserCard[]> =>
  USE_MOCK ? mock.getRequests() : client.get<UserCard[]>('/friends/requests').then((r) => r.data)

export const searchUsers = (q: string): Promise<UserCard[]> =>
  USE_MOCK ? mock.searchUsers(q) : client.get<UserCard[]>('/users', { params: { q } }).then((r) => r.data)

export const getProfile = (userId: number): Promise<Profile> =>
  USE_MOCK ? mock.getProfile(userId) : client.get<Profile>(`/users/${userId}`).then((r) => r.data)

export const requestFriend = (userId: number): Promise<void> =>
  USE_MOCK ? mock.requestFriend(userId) : client.post(`/friends/${userId}`).then(() => undefined)

export const acceptFriend = (userId: number): Promise<void> =>
  USE_MOCK ? mock.acceptFriend(userId) : client.post(`/friends/${userId}/accept`).then(() => undefined)

/** 거절 · 요청 취소 · 친구 끊기 — 결과가 모두 '남' 이라 한 곳에서 받는다 */
export const unfriend = (userId: number): Promise<void> =>
  USE_MOCK ? mock.unfriend(userId) : client.delete(`/friends/${userId}`).then(() => undefined)

export const toggleLike = (itemId: string): Promise<{ liked: boolean; likeCount: number }> =>
  USE_MOCK
    ? mock.toggleLike(itemId)
    : client.post<{ liked: boolean; likeCount: number }>(`/feed/${itemId}/like`).then((r) => r.data)

export const markOpened = (itemId: string): Promise<void> =>
  USE_MOCK ? mock.markOpened(itemId) : client.post(`/feed/${itemId}/open`).then(() => undefined)

/**
 * 신고 — 기록 한 건 또는 사람 한 명.
 * 대상은 `entry:{itemId}` · `user:{userId}` 로 적는다. 한 엔드포인트가 둘 다 받는다
 */
export const report = (target: string, reason: ReportReason, detail?: string): Promise<void> =>
  USE_MOCK
    ? mock.report(target, reason, detail)
    : client.post('/reports', { target, reason, detail }).then(() => undefined)

/** 차단 — 친구 끊기와 다르다. 서로 못 찾게 된다 */
export const blockUser = (userId: number): Promise<void> =>
  USE_MOCK ? mock.blockUser(userId) : client.post(`/blocks/${userId}`).then(() => undefined)

export const unblockUser = (userId: number): Promise<void> =>
  USE_MOCK ? mock.unblockUser(userId) : client.delete(`/blocks/${userId}`).then(() => undefined)

export const getBlocked = (): Promise<UserCard[]> =>
  USE_MOCK ? mock.getBlocked() : client.get<UserCard[]>('/blocks').then((r) => r.data)

/** 계정 삭제. 되돌릴 수 없다 — 확인은 부르는 쪽이 받는다 */
export const deleteAccount = (): Promise<void> =>
  USE_MOCK ? mock.deleteAccount() : client.delete('/users/me').then(() => undefined)

/** 아직 안 남긴 친구 콕 찌르기. 하루에 한 사람당 한 번 */
export const nudge = (userId: number): Promise<void> =>
  USE_MOCK ? mock.nudge(userId) : client.post(`/friends/${userId}/nudge`).then(() => undefined)

export const getComments = (itemId: string): Promise<Comment[]> =>
  USE_MOCK ? mock.getComments(itemId) : client.get<Comment[]>(`/feed/${itemId}/comments`).then((r) => r.data)

export const addComment = (itemId: string, text: string): Promise<Comment> =>
  USE_MOCK
    ? mock.addComment(itemId, text)
    : client.post<Comment>(`/feed/${itemId}/comments`, { text }).then((r) => r.data)
