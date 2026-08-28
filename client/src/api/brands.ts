import { api, authApi } from './index'
import type { Brand } from '../types'

export async function fetchBrands(): Promise<Brand[]> {
  return api<Brand[]>('/api/brands')
}

export async function createBrand(data: Partial<Brand>): Promise<Brand> {
  return authApi<Brand>('/api/brands', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBrand(id: string, data: Partial<Brand>): Promise<Brand> {
  return authApi<Brand>(`/api/brands/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteBrand(id: string): Promise<void> {
  await authApi(`/api/brands/${id}`, { method: 'DELETE' })
}
