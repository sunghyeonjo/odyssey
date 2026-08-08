import type { FollowStatus, FollowUser, PageResponse } from '@buffett-diary/shared'
import client from './client'

export const followsApi = {
  follow(userId: number) {
    return client.post(`/follows/${userId}`)
  },
  unfollow(userId: number) {
    return client.delete(`/follows/${userId}`)
  },
  status(userId: number) {
    return client.get<FollowStatus>(`/follows/${userId}/status`)
  },
  followers(userId: number, page = 0, size = 20) {
    return client.get<PageResponse<FollowUser>>(`/follows/${userId}/followers`, { params: { page, size } })
  },
  following(userId: number, page = 0, size = 20) {
    return client.get<PageResponse<FollowUser>>(`/follows/${userId}/following`, { params: { page, size } })
  },
}
