import { api, authApi } from './index'
import type { Product } from '../types'

export type { Product, ProductColor, ProductVolume } from '../types'

export async function fetchProducts(): Promise<Product[]> {
  return api<Product[]>('/api/products')
}

export async function deleteProduct(id: string): Promise<void> {
  await authApi(`/api/products/${id}`, { method: 'DELETE' })
}

export async function bulkDeleteProducts(ids: string[]): Promise<{ deleted: number }> {
  return authApi<{ deleted: number }>('/api/products/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  return authApi<Product>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
