import type { AppNotification, UnreadCount, PageResponse } from '@buffett-diary/shared'
import client from './client'

export const notificationsApi = {
  list(page = 0, size = 20) {
    return client.get<PageResponse<AppNotification>>('/notifications', { params: { page, size } })
  },
  unreadCount() {
    return client.get<UnreadCount>('/notifications/unread-count')
  },
  markAsRead(id: number) {
    return client.put(`/notifications/${id}/read`)
  },
  markAllAsRead() {
    return client.put('/notifications/read-all')
  },
}
