export interface User {
  id: number
  email: string
  nickname: string
  bio: string | null
  createdAt: string
}

export interface PublicTradeStats {
  totalTrades: number
  winRate: number
  totalProfit: number
}

export interface Badge {
  type: string
  name: string
  description: string
  earnedAt: string
}

export interface UserProfile {
  id: number
  nickname: string
  bio: string | null
  createdAt: string
  followerCount: number
  followingCount: number
  isFollowing: boolean
  isOwnProfile: boolean
  publicStats?: PublicTradeStats | null
  badges: Badge[]
  showOnLeaderboard: boolean
}

export interface LeaderboardEntry {
  userId: number
  nickname: string
  totalTrades: number
  winRate: number
  totalProfit: number
}

export interface UserSearchResult {
  id: number
  nickname: string
  bio: string | null
}

export interface UpdateProfileRequest {
  bio?: string | null
  nickname?: string
  showOnLeaderboard?: boolean
}

export interface NotificationSetting {
  followNotify: boolean
  commentNotify: boolean
  likeNotify: boolean
}

export interface UpdateNotificationSettingRequest {
  followNotify?: boolean
  commentNotify?: boolean
  likeNotify?: boolean
}

export interface AppNotification {
  id: number
  actorId: number
  actorNickname: string
  notificationType: string
  referenceType: string
  referenceId: number
  message: string
  isRead: boolean
  createdAt: string
}

export interface UnreadCount {
  count: number
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  nickname: string
  code: string
}

export interface SendCodeRequest {
  email: string
}

export interface VerifyCodeRequest {
  email: string
  code: string
}
