import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Product, ProductVolume } from '../types'

const CART_KEY = 'opencode_cart'

export interface CartVolume extends ProductVolume {}

export interface CartColor {
  name: string
  image?: string
  stock?: number
  price?: number
}

export interface CartItem {
  product: Product
  quantity: number
  volume?: CartVolume
  color?: CartColor
  key: string
}

interface CartContextType {
  items: CartItem[]
  itemCount: number
  total: number
  addItem: (product: Product, quantity?: number, volume?: CartVolume | CartColor) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    saveCart(items)
  }, [items])

  const itemCount = items.length
  const total = items.reduce((sum, item) => sum + (item.color?.price ?? item.volume?.price ?? item.product.price) * item.quantity, 0)

  function productKey(p: Product | any, volume?: CartVolume | CartColor): string {
    const variant = volume && 'name' in volume ? volume.name : volume?.label
    return `${p.id ?? p._id}|${variant ?? ''}`
  }

  function getStock(product: Product, volume?: CartVolume | CartColor): number | undefined {
    if (volume?.stock !== undefined) return volume.stock
    return (product as any).stock
  }

  const addItem = useCallback((product: Product, quantity = 1, volume?: CartVolume | CartColor) => {
    setItems((prev) => {
      const key = productKey(product, volume)
      const existing = prev.find((item) => item.key === key)
      const currentQty = existing ? existing.quantity : 0
      const stock = getStock(product, volume)
      const available = stock === undefined ? Infinity : Math.max(0, stock - currentQty)
      const actualQty = Math.min(quantity, available)
      if (actualQty <= 0) return prev
      const isColor = volume != null && 'name' in volume
      if (existing) {
        return prev.map((item) =>
          item.key === key
            ? { ...item, quantity: currentQty + actualQty }
            : item
        )
      }
      return [...prev, {
        product,
        quantity: actualQty,
        volume: isColor ? undefined : (volume as CartVolume),
        color: isColor ? (volume as CartColor) : undefined,
        key,
      }]
    })
  }, [])

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }, [])

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.key !== key))
      return
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        const stock = item.color?.stock ?? getStock(item.product, item.volume)
        const maxQty = stock ?? Infinity
        return { ...item, quantity: Math.min(quantity, maxQty) }
      })
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  return (
    <CartContext.Provider value={{ items, itemCount, total, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
