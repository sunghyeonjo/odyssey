export interface JournalImageMeta {
  id: number
  journalId: number
  fileName: string
  contentType: string
  fileSize: number
  createdAt: string
}

export interface AuthorSummary {
  id: number
  nickname: string
}

export interface Journal {
  id: number
  userId: number
  title: string
  content: string
  journalDate: string
  createdAt: string
  updatedAt: string
  images: JournalImageMeta[]
  author?: AuthorSummary
  likeCount: number
  myLike: boolean | null
  commentCount: number
  linkedTradeIds: number[]
}

export interface JournalRequest {
  title: string
  content: string
  journalDate: string
  tradeIds?: number[]
}

export interface JournalFilter {
  startDate?: string
  endDate?: string
  page?: number
  size?: number
}

export interface JournalComment {
  id: number
  journalId: number
  userId: number
  nickname: string
  parentId: number | null
  content: string
  createdAt: string
  updatedAt: string
}

export interface JournalCommentRequest {
  content: string
}

export interface JournalLikeRequest {
  liked: boolean | null
}
