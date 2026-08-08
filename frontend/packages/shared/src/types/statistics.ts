export interface TradeStats {
  totalTrades: number
  buyCount: number
  sellCount: number
  winCount: number
  lossCount: number
  winRate: number
  totalProfit: number
  averageProfit: number
  bestTrade: number
  worstTrade: number
}

export interface TickerStats {
  ticker: string
  tradeCount: number
  winCount: number
  lossCount: number
  winRate: number
  totalProfit: number
  avgProfit: number
  stockInfo?: { nameKo?: string; logoUrl?: string }
}

export interface MonthlyPnl {
  month: string
  totalProfit: number
  tradeCount: number
  winRate: number
}

export interface EquityCurvePoint {
  date: string
  cumulativeProfit: number
}

export interface DailyPnlEntry {
  date: string
  profit: number
}

export interface PeriodReview {
  period: string
  totalTrades: number
  totalProfit: number
  winRate: number
  topPerformer: string | null
  worstPerformer: string | null
  mostTradedTicker: string | null
  winRateChange: number | null
}
