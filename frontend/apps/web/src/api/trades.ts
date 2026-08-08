import type { Trade, TradeRequest, TradeFilter, PageResponse, TradeStats, TradeImageMeta, TradeCommentRequest, TradeLikeRequest, TradeComment, TickerStats, MonthlyPnl, EquityCurvePoint, DailyPnlEntry, PeriodReview } from '@buffett-diary/shared'
import client from './client'

export const tradesApi = {
  list(filter: TradeFilter = {}) {
    return client.get<PageResponse<Trade>>('/trades', { params: filter })
  },
  get(id: number) {
    return client.get<Trade>(`/trades/${id}`)
  },
  create(data: TradeRequest) {
    return client.post<Trade>('/trades', data)
  },
  bulkCreate(data: TradeRequest[]) {
    return client.post<Trade[]>('/trades/bulk', data)
  },
  update(id: number, data: TradeRequest) {
    return client.put<Trade>(`/trades/${id}`, data)
  },
  delete(id: number) {
    return client.delete(`/trades/${id}`)
  },
  stats(period: 'today' | 'week' | 'month' | 'year' | 'all' = 'all') {
    return client.get<TradeStats>('/trades/stats', { params: { period } })
  },
  tickerStats() {
    return client.get<TickerStats[]>('/trades/stats/by-ticker')
  },
  monthlyPnl() {
    return client.get<MonthlyPnl[]>('/trades/stats/monthly')
  },
  equityCurve() {
    return client.get<EquityCurvePoint[]>('/trades/stats/equity-curve')
  },
  dailyPnl(year: number) {
    return client.get<DailyPnlEntry[]>('/trades/stats/daily-pnl', { params: { year } })
  },
  review(type: 'weekly' | 'monthly', date?: string) {
    return client.get<PeriodReview>('/trades/review', { params: { type, date } })
  },
}

export const tradeLikeApi = {
  update(tradeId: number, data: TradeLikeRequest) {
    return client.put<Trade>(`/trades/${tradeId}/like`, data)
  },
}

export const tradeCommentsApi = {
  list(tradeId: number) {
    return client.get<TradeComment[]>(`/trades/${tradeId}/comments`)
  },
  create(tradeId: number, data: TradeCommentRequest) {
    return client.post<TradeComment>(`/trades/${tradeId}/comments`, data)
  },
  reply(tradeId: number, commentId: number, data: TradeCommentRequest) {
    return client.post<TradeComment>(`/trades/${tradeId}/comments/${commentId}/replies`, data)
  },
  update(tradeId: number, commentId: number, data: TradeCommentRequest) {
    return client.put<TradeComment>(`/trades/${tradeId}/comments/${commentId}`, data)
  },
  delete(tradeId: number, commentId: number) {
    return client.delete(`/trades/${tradeId}/comments/${commentId}`)
  },
}

export const tradeImagesApi = {
  upload(tradeId: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return client.post<TradeImageMeta>(`/trades/${tradeId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete(tradeId: number, imageId: number) {
    return client.delete(`/trades/${tradeId}/images/${imageId}`)
  },
  fetchBlob(tradeId: number, imageId: number) {
    return client.get<Blob>(`/trades/${tradeId}/images/${imageId}`, {
      responseType: 'blob',
    })
  },
}
