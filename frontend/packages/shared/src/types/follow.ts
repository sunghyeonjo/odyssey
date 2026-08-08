export interface FollowStatus {
  isFollowing: boolean
}

export interface FollowUser {
  id: number
  nickname: string
  bio: string | null
  isFollowing: boolean
}
