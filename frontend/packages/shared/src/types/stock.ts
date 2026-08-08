export interface Stock {
  ticker: string
  nameEn: string
  nameKo?: string
  logoUrl?: string
  sector?: string
  exchange?: string
}

export interface StockSummary {
  nameKo?: string
  logoUrl?: string
}
