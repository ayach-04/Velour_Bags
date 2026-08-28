import { api, authApi } from './index'
import type { Famille, Category } from '../types'

export async function fetchFamilles(): Promise<Famille[]> {
  return api<Famille[]>('/api/categories/familles')
}

export async function createFamille(data: Partial<Famille>): Promise<Famille> {
  return authApi<Famille>('/api/categories/familles', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateFamille(id: string, data: Partial<Famille>): Promise<Famille> {
  return authApi<Famille>(`/api/categories/familles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteFamille(id: string): Promise<void> {
  await authApi(`/api/categories/familles/${id}`, { method: 'DELETE' })
}

export async function fetchCategories(): Promise<Category[]> {
  return api<Category[]>('/api/categories')
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
  return authApi<Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<Category> {
  return authApi<Category>(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: string): Promise<void> {
  await authApi(`/api/categories/${id}`, { method: 'DELETE' })
}
