import type { Entry, FeedItem, Me } from '@/api/types'
import type { DateKey } from '@/lib/date'
import { colors } from '@/theme'

/** 내 기록을 남의 기록과 같은 그릇에 담는다 — `PostCard` 와 상세를 그대로 재사용하기 위해 */
export const toFeedItem = (e: Entry, me: Me | undefined): FeedItem => ({
  id: `me-${e.dateKey}`,
  author: me ?? { id: 0, name: '나', color: colors.accent },
  text: e.text,
  photos: e.photos,
  thumb: e.thumb,
  mine: true,
  visibility: e.visibility,
  paper: e.paper,
  likeCount: e.likeCount ?? 0,
  likedByMe: e.likedByMe ?? false,
  commentCount: e.commentCount ?? 0,
  openedByMe: true,
  createdAt: e.createdAt,
})

/** 피드 항목의 id 는 `작성자-날짜` 다 */
export const dateOfItem = (itemId: string): DateKey => itemId.slice(itemId.indexOf('-') + 1)
