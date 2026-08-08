import type { Journal, AuthorSummary } from './journal'
import type { Trade } from './trade'

export interface FeedItem {
  type: 'journal' | 'trade'
  journal: Journal | null
  trade: Trade | null
  author: AuthorSummary
  createdAt: string
}
