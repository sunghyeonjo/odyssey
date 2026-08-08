import type { StockSummary } from './stock'

export type Position = 'BUY' | 'SELL'

export interface TradeImageMeta {
  id: number
  tradeId: number
  fileName: string
  contentType: string
  fileSize: number
  createdAt: string
}

export interface Trade {
  id: number
  userId: number
  tradeDate: string
  ticker: string
  position: Position
  quantity: number
  entryPrice: number
  exitPrice: number | null
  profit: number | null
  reason: string | null
  likeCount: number
  myLike: boolean | null
  commentCount: number
  createdAt: string
  updatedAt: string
  stockInfo?: StockSummary
  images: TradeImageMeta[]
  targetPrice: number | null
  stopLossPrice: number | null
}

export interface TradeRequest {
  tradeDate: string
  ticker: string
  position: Position
  quantity: number
  entryPrice: number
  exitPrice?: number | null
  profit?: number | null
  reason?: string | null
  targetPrice?: number | null
  stopLossPrice?: number | null
}

export interface TradeCommentRequest {
  content: string
}

export interface TradeLikeRequest {
  liked: boolean | null
}

export interface TradeComment {
  id: number
  tradeId: number
  userId: number
  nickname: string
  parentId: number | null
  content: string
  createdAt: string
  updatedAt: string
}

export interface TradeFilter {
  startDate?: string
  endDate?: string
  ticker?: string
  position?: Position
  page?: number
  size?: number
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}
