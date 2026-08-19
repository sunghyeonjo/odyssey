import type { DateKey } from '@/lib/date'

/** 기록을 누가 볼 수 있는지. 축은 이것 하나뿐이다 */
export type Visibility = 'friends' | 'private'

/**
 * 사진 없이 글만 남긴 날의 종이. 사진이 없으면 이것이 그 자리를 대신한다.
 * 배경과 글씨를 함께 들고 다녀야 달력 칸·상세·썸네일이 같은 색으로 그려진다
 */
export interface Paper {
  bg: string
  ink: string
}

/** 내 하루 기록 (날짜당 1개) */
export interface Entry {
  dateKey: DateKey
  text: string
  photos: string[] // URL 또는 로컬 URI
  createdAt: string
  visibility: Visibility
  /**
   * 달력 칸처럼 **작게 놓이는 자리**에서 쓸 작은 사진.
   * 44pt 타일에 원본을 넣으면 한 달치 서른 장이 메모리를 통째로 먹는다.
   * 없으면 원본으로 떨어진다
   */
  thumb?: string
  /** 사진이 없을 때만 쓰인다 */
  paper?: Paper
  /** 친구들에게서 받은 반응. 읽기 전용으로만 쓰인다 */
  likeCount?: number
  commentCount?: number
  /** 내 기록에도 내가 좋아요를 남길 수 있다 */
  likedByMe?: boolean
}

export interface Me {
  id: number
  name: string
  /** 검색으로 찾을 때 쓰는 아이디 */
  handle: string
  /** 사진이 없을 때 쓰는 이니셜 아바타 배경색 */
  color: string
  /** 프로필 사진. 없으면 이니셜 아바타 */
  avatar?: string
}

/** 프로필에서 고칠 수 있는 것. 안 넘긴 항목은 그대로 둔다 */
export interface UpdateMePatch {
  nickname?: string
  /** `null` 이면 사진을 지운다 */
  avatar?: string | null
}

export interface Author {
  id: number
  name: string
  /** 사진이 없을 때 쓰는 이니셜 아바타 배경색 */
  color: string
  /** 프로필 사진. 없으면 이니셜 아바타 */
  avatar?: string
}

/**
 * 친구 관계.
 *  none      남
 *  requested 내가 요청함
 *  incoming  상대가 나에게 요청함
 *  friends   서로 수락함
 */
export type FriendState = 'none' | 'requested' | 'incoming' | 'friends'

/**
 * 신고 사유.
 *
 * 목록은 **고르기 쉬운 만큼 짧게, 판단할 수 있을 만큼 구체적으로.**
 * `기타` 만 두면 접수된 글을 사람이 하나씩 읽어야 하고, 열 갈래로 늘리면 아무도 안 고른다.
 */
export type ReportReason = 'spam' | 'harassment' | 'sexual' | 'violence' | 'impersonation' | 'other'

/**
 * 친구가 오늘 남긴 것의 미리보기. 목록 응답에 실리므로 **작아야 한다.**
 *
 * 사진이 있으면 `thumb`, 없으면 `note` + `paper` 로 종이를 그린다 —
 * 앱의 다른 자리(달력 칸 · 상세 · 카드)가 사진 없는 날을 그리는 방식과 같다.
 * 둘 중 하나는 늘 있다. 글도 사진도 없는 기록은 저장될 수 없다
 */
export interface TodayPeek {
  thumb?: string
  note?: string
  paper?: Paper
}

/** 검색 결과 · 친구 목록 · 요청함에 쓰는 한 줄 */
export interface UserCard extends Author {
  handle: string
  friendState: FriendState
  /**
   * 내가 차단한 사람. 차단은 친구 끊기와 다르다 —
   * 끊긴 사람은 다시 요청할 수 있지만 차단된 사람은 나를 찾을 수도 없다
   */
  blocked?: boolean
  /** 오늘 기록을 남겼는지. 친구일 때만 참일 수 있다 */
  postedToday: boolean
  /**
   * 오늘 남긴 것의 미리보기 — **나에게 보이는 날만** 온다.
   *
   * `postedToday` 가 참인데 이게 없으면 **'나만 보기' 로 남긴 날**이다(자물쇠로 그린다).
   * 남겼다는 사실과 내용은 따로다 — 사실은 늘 오고, 내용은 공개 범위를 통과해야 온다
   */
  today?: TodayPeek
  /** 오늘 내가 이미 콕 찔렀는지. 하루에 한 사람당 한 번 */
  nudgedByMe?: boolean
}

/** 남의 프로필. 친구가 아니면 entries 는 빈 배열로 내려온다 */
export interface Profile extends UserCard {
  entryCount: number
  entries: FeedItem[]
  /**
   * 그날 남기긴 했지만 '나만 보기' 라 나에게는 안 열리는 날들.
   * 내용은 한 글자도 안 온다 — 날짜만 온다. 달력에 자물쇠 칸으로 앉는다
   */
  lockedDates: DateKey[]
}

export interface Comment {
  id: string
  author: Author
  text: string
  createdAt: string
}

export interface FeedItem {
  id: string
  author: Author
  text: string
  photos: string[]
  mine: boolean
  /**
   * 내 기록일 때만 채운다 — 남의 기록은 공개 범위를 알 길이 없다.
   * 지금 이게 누구에게 보이는지는 기록을 볼 때마다 눈에 있어야 한다
   */
  visibility?: Visibility
  /** 달력 칸처럼 작게 놓이는 자리에서 쓸 작은 사진. 없으면 원본으로 떨어진다 */
  thumb?: string
  /** 사진이 없을 때만 — 이 색으로 종이를 그린다 */
  paper?: Paper
  likeCount: number
  likedByMe: boolean
  commentCount: number
  /** 내가 이미 열어본 기록인지. false 면 카드에 안 읽음 점이 붙는다 */
  openedByMe: boolean
  /** 남긴 시각 */
  createdAt: string
}

export interface Stats {
  totalEntries: number
  friendCount: number
  /** 아직 답하지 않은 받은 요청 수 */
  requestCount: number
}

export interface CreateEntryInput {
  dateKey: DateKey
  text: string
  photos: string[]
  visibility: Visibility
  paper?: Paper
}
