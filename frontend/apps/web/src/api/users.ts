import type { UpdateProfileRequest } from '@odyssey/shared'
import client from './client'

export const usersApi = {
  updateProfile(data: UpdateProfileRequest) {
    return client.put('/users/me/profile', data)
  },
  deleteAccount() {
    return client.delete('/users/me')
  },
}
