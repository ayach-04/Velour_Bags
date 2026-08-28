export interface ProductVolume {
  label: string
  price: number
  costPrice?: number
  stock?: number
  oldPrice?: number
}

export interface ProductColor {
  name: string
  price: number
  costPrice?: number
  stock?: number
  oldPrice?: number
  image: string
  images?: string[]
}

export interface Product {
  _id: string
  id: number
  name: string
  category: string
  price: number
  costPrice?: number
  oldPrice?: number
  image: string
  images?: string[]
  label?: 'NEW' | 'PROMO' | 'OUT_OF_STOCK'
  description?: string
  benefits?: string[]
  howToUse?: string
  ingredients?: string
  volume?: string
  brand?: string
  stock?: number
  volumes?: ProductVolume[]
  colors?: ProductColor[]
  published?: boolean
  createdAt: string
}

export interface Brand {
  id?: number
  _id: string
  name: string
  slug: string
  logo?: string
  description?: string
  website?: string
  country?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  productCount?: number
}

export interface Famille {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  categoryCount?: number
  productCount?: number
}

export interface Category {
  _id: string
  name: string
  slug: string
  familleId?: string | Famille
  description?: string
  image?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  productCount?: number
}