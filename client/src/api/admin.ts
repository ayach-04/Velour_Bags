import { authApi } from './index'

export interface AdminUser {
  _id: string
  name: string
  email: string
  role?: string
  image?: string
  createdAt: string
}

export async function fetchMe(): Promise<{ admin: AdminUser }> {
  return authApi<{ admin: AdminUser }>('/api/admin/me')
}

export async function updateAdminProfile(data: { name: string; email: string; image?: string }): Promise<{ admin: AdminUser }> {
  return authApi<{ admin: AdminUser }>('/api/admin/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function changeAdminPassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
  return authApi<{ message: string }>('/api/admin/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
