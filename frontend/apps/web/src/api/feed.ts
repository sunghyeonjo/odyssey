import type { FeedItem, PageResponse } from '@buffett-diary/shared'
import client from './client'

export const feedApi = {
  list(page = 0, size = 20) {
    return client.get<PageResponse<FeedItem>>('/feed', { params: { page, size } })
  },
}
