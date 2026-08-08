import type { UserProfile, UserSearchResult, UpdateProfileRequest, PageResponse, Journal, Trade, NotificationSetting, UpdateNotificationSettingRequest, Badge, LeaderboardEntry } from '@buffett-diary/shared'
import client from './client'

export const usersApi = {
  search(q: string, page = 0, size = 20) {
    return client.get<PageResponse<UserSearchResult>>('/users/search', { params: { q, page, size } })
  },
  profile(userId: number) {
    return client.get<UserProfile>(`/users/${userId}/profile`)
  },
  updateProfile(data: UpdateProfileRequest) {
    return client.put('/users/me/profile', data)
  },
  deleteAccount() {
    return client.delete('/users/me')
  },
  getNotificationSettings() {
    return client.get<NotificationSetting>('/users/me/notification-settings')
  },
  updateNotificationSettings(data: UpdateNotificationSettingRequest) {
    return client.put<NotificationSetting>('/users/me/notification-settings', data)
  },
  journals(userId: number, page = 0, size = 20) {
    return client.get<PageResponse<Journal>>(`/users/${userId}/journals`, { params: { page, size } })
  },
  trades(userId: number, page = 0, size = 20) {
    return client.get<PageResponse<Trade>>(`/users/${userId}/trades`, { params: { page, size } })
  },
  badges() {
    return client.get<Badge[]>('/users/me/badges')
  },
}

export const leaderboardApi = {
  list(type: 'totalProfit' | 'winRate' = 'totalProfit', minTrades = 10) {
    return client.get<LeaderboardEntry[]>('/leaderboard', { params: { type, minTrades } })
  },
}
