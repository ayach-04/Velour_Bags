import type { Product } from '../types'
import { api } from './index'
import { readCache, writeCache, removeCache } from './cache'

const PRODUCTS_KEY = 'products'

let cached: Product[] | null = null
let refreshing: Promise<Product[]> | null = null

export function getCachedProducts(): Product[] {
  if (cached) return cached
  cached = readCache<Product[]>(PRODUCTS_KEY)
  return cached || []
}

export function clearProductCache(): void {
  cached = null
  removeCache(PRODUCTS_KEY)
}

export function refreshProducts(): Promise<Product[]> {
  if (refreshing) return refreshing
  refreshing = api<Product[]>('/api/products')
    .then(list => {
      cached = list
      writeCache(PRODUCTS_KEY, list)
      return list
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}