import type { Stock } from '@buffett-diary/shared'
import client from './client'

export const stocksApi = {
  search(query: string) {
    return client.get<Stock[]>('/stocks/search', { params: { q: query } })
  },
}
