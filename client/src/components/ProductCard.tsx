import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiPhoto, HiPlus } from 'react-icons/hi2'
import type { Product } from '../types'
import { getDisplayVolumeInfo } from '../utils/product'
import { useCart } from '../context/CartContext'

interface ProductCardProps {
  product: Product
  size?: 'md' | 'lg'
}

export default function ProductCard({ product, size = 'md' }: ProductCardProps) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const [secondImgError, setSecondImgError] = useState(false)
  const { addItem } = useCart()
  const volumes = product.volumes && product.volumes.length ? product.volumes : null
  const outOfStock = product.label === 'OUT_OF_STOCK' || (volumes
    ? volumes.every(v => (v.stock ?? 0) <= 0)
    : (product.stock !== undefined && product.stock <= 0))
  const info = getDisplayVolumeInfo(product)
  const displayPrice = info.price
  const displayBase = info.base
  const discount = info.discount
  const productId = product.id || (product as any)._id
  const priceLabel = volumes && volumes.length > 1
    ? (discount > 0 ? `${Math.round(displayPrice)} DA` : `Des ${Math.round(displayPrice)} DA`)
    : `${Math.round(displayPrice)} DA`

  const secondImage = product.images?.[0] || product.colors?.[0]?.image
  const hasSecondImage = !!secondImage && !imgError

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (outOfStock) return
    if (volumes && volumes.length > 1) {
      navigate(`/product/${productId}`)
      return
    }
    addItem(product, 1, volumes?.[0])
  }

  return (
    <a href={`/product/${productId}`} className="group block" onClick={(e) => { e.preventDefault(); navigate(`/product/${productId}`) }}>
      <div className="relative overflow-hidden bg-muted mb-3 aspect-square">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center">
            <HiPhoto size={36} className="text-muted-foreground/30" />
          </div>
        ) : (
          <>
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-cover transition-opacity duration-500 ${hasSecondImage ? 'group-hover:opacity-0' : 'transition-transform duration-700 group-hover:scale-[1.04]'} ${outOfStock ? 'opacity-40' : ''}`}
              loading="lazy"
              onError={() => setImgError(true)}
            />
            {hasSecondImage && !secondImgError && (
              <img
                src={secondImage!}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${outOfStock ? 'opacity-0' : ''}`}
                onError={() => setSecondImgError(true)}
              />
            )}
          </>
        )}

        {product.label === 'NEW' && (
          <div className="absolute top-3 left-3 bg-accent text-background font-sans px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase z-10">
            New
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-secondary text-background font-sans px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase z-10">
            -{discount}%
          </div>
        )}
        {outOfStock && (
          <div className="absolute top-3 left-3 bg-accent text-background font-sans px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase z-10">
            Epuise
          </div>
        )}

        {!outOfStock && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 w-8 h-8 bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-background cursor-pointer text-foreground z-10"
            aria-label="Ajouter au panier"
          >
            <HiPlus size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="px-1">
        <div className="flex justify-between items-baseline gap-2">
          <p className="font-sans text-xs font-medium truncate">{product.name}</p>
          <p className="font-sans text-xs whitespace-nowrap flex-none">{priceLabel}</p>
        </div>
        <p className="font-sans text-[11px] opacity-60 truncate mt-0.5">
          {product.brand ? `${product.brand} | ${product.category}` : product.category}
        </p>
      </div>
    </a>
  )
}
