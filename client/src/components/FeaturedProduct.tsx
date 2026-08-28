import { useState } from 'react'
import { HiShoppingBag, HiPhoto } from 'react-icons/hi2'
import ProductCard from './ProductCard'
import type { Product } from '../types'
import { getDisplayVolumeInfo } from '../utils/product'

interface FeaturedProductProps {
  product: Product
  image: string
}

export default function FeaturedProduct({ product, image }: FeaturedProductProps) {
  const [imgError, setImgError] = useState(false)
  const info = getDisplayVolumeInfo(product)
  const discount = info.discount
  const volumes = product.volumes && product.volumes.length ? product.volumes : null
  const priceLabel = volumes && volumes.length > 1 && discount === 0
    ? `Des ${Math.round(info.price)} DA`
    : `${Math.round(info.price)} DA`

  return (
    <section className="px-4 py-10 md:py-14">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row items-stretch bg-cream-dark overflow-hidden min-h-[300px] lg:min-h-[480px]">
          <div
            className="hidden lg:block w-full lg:w-[45%] bg-cover bg-center"
            style={{ backgroundImage: `url(${image})` }}
          />

          <div className="w-full lg:w-[55%] flex flex-col justify-center p-8 md:p-10 lg:p-14">
            <div className="w-full max-w-2xl lg:ml-8">
              <span className="text-[10px] font-semibold text-primary tracking-[0.3em] uppercase">
                Decouverte
              </span>
              <h2 className="font-display text-2xl md:text-4xl text-text mt-3 mb-5 leading-tight">
                La selection de la semaine
              </h2>
              <p className="text-sm md:text-base text-text-secondary leading-relaxed mb-8 max-w-md">
                Chaque semaine, nous Selectionnons pour vous les pieces les plus
                remarquables. Des sacs qui allient elegance, qualite et style intemporel.
              </p>

              <div className="w-full max-w-xs lg:hidden">
                <ProductCard product={product} />
              </div>

              <div className="hidden lg:flex items-center gap-4 w-full">
                <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-cream">
                  {imgError ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <HiPhoto size={24} className="text-primary/20" />
                    </div>
                  ) : (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => setImgError(true)}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-text-secondary/50 uppercase tracking-wider">
                    {product.category}
                  </span>
                  <div className="flex items-center gap-10">
                    <h3 className="text-sm font-medium text-text leading-snug line-clamp-3">
                      {product.name}
                    </h3>
                    {info.base && info.base > info.price ? (
                      <div className="flex flex-col flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {priceLabel}
                        </span>
                        <span className="text-xs text-text-secondary/40 line-through">
                          {Math.round(info.base)} DA
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-text flex-shrink-0">
                        {priceLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex justify-start mt-10">
                <button className="px-10 py-3.5 bg-primary text-white text-[11px] font-semibold tracking-[0.2em] uppercase cursor-pointer hover:bg-primary-light transition-colors flex items-center justify-center gap-2">
                  <HiShoppingBag size={16} />
                  Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
