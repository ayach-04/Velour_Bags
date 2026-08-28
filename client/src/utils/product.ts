export function isProductNew(product: { label?: string; createdAt?: string | Date }): boolean {
  if (product.label !== 'NEW') return false

  if (product.createdAt) {
    const created = new Date(product.createdAt)
    const now = new Date()
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 15
  }

  return true
}

export interface VolumeLike {
  label: string
  price: number
  oldPrice?: number
  stock?: number
}

export interface DisplayVolumeInfo {
  vol: VolumeLike | null
  price: number
  base: number | undefined
  discount: number
}

const cheapestVolume = (arr: VolumeLike[]) => arr.reduce((a, b) => (a.price <= b.price ? a : b))

export function getDisplayVolumeInfo(product: { volumes?: VolumeLike[]; price?: number; oldPrice?: number }): DisplayVolumeInfo {
  const volumes = product.volumes && product.volumes.length ? product.volumes : null

  if (!volumes) {
    const price = product.price ?? 0
    const base = product.oldPrice
    return {
      vol: null,
      price,
      base,
      discount: base && base > price ? Math.round((1 - price / base) * 100) : 0,
    }
  }

  const inStock = volumes.filter(v => (v.stock ?? 0) > 0)
  const promoVol = volumes.find(v => v.oldPrice != null && (v.stock ?? 0) > 0) ?? null
  const vol = promoVol ?? (inStock.length ? cheapestVolume(inStock) : cheapestVolume(volumes))
  const base = vol.oldPrice != null
    ? vol.oldPrice
    : (volumes.some(v => v.oldPrice != null) ? undefined : product.oldPrice)
  const price = vol.price
  const discount = base && base > price ? Math.round((1 - price / base) * 100) : 0

  return { vol, price, base, discount }
}
