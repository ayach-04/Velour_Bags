import { useState, useEffect, useCallback, useRef } from 'react'
import ProductCard from './ProductCard'
import type { Product } from '../types'

interface ProductSectionProps {
  title: string
  subtitle: string
  products: Product[]
}

export default function ProductSection({ title, subtitle, products }: ProductSectionProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const rafRef = useRef<number | undefined>(undefined)
  const touchStartX = useRef(0)
  const touchStartOffset = useRef(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const getOneSetWidth = useCallback(() => {
    if (!trackRef.current) return 0
    return trackRef.current.scrollWidth / 2
  }, [])

  useEffect(() => {
    if (!isMobile) return

    if (isPaused) {
      cancelAnimationFrame(rafRef.current!)
      return
    }

    const lastTime = { current: performance.now() }

    const tick = (now: number) => {
      const delta = now - lastTime.current
      lastTime.current = now
      offsetRef.current += delta * 0.02

      const oneSet = getOneSetWidth()
      if (oneSet > 0 && offsetRef.current >= oneSet) {
        offsetRef.current -= oneSet
      }
      if (oneSet > 0 && offsetRef.current < 0) {
        offsetRef.current += oneSet
      }

      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [isPaused, getOneSetWidth, isMobile])

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true)
    touchStartX.current = e.touches[0].clientX
    touchStartOffset.current = offsetRef.current
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.touches[0].clientX
    const newOffset = touchStartOffset.current + delta
    const oneSet = getOneSetWidth()
    const clamped = Math.max(0, Math.min(newOffset, oneSet))
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${clamped}px)`
    }
    offsetRef.current = clamped
  }

  const handleTouchEnd = () => {
    setIsPaused(false)
  }

  return (
    <section className="py-14 md:py-20 px-4">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <span className="text-[10px] font-semibold text-primary tracking-[0.3em] uppercase block mb-2">
              {subtitle}
            </span>
            <h2 className="font-display text-2xl md:text-4xl text-text">
              {title}
            </h2>
          </div>
          <a
            href="/search"
            className="hidden md:inline-block text-[11px] font-semibold text-primary tracking-[0.15em] uppercase hover:opacity-60 transition-opacity pb-1 border-b border-primary/30"
          >
            Voir tout
          </a>
        </div>

        <div
          className="overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            ref={trackRef}
            className={`flex gap-4 md:gap-5 ${!isMobile ? 'overflow-x-auto scrollbar-hide' : ''}`}
            style={isMobile ? { transform: 'translateX(0px)' } : undefined}
          >
            {(isMobile ? [...products, ...products] : products).map((product, i) => (
              <div
                key={`${product.id}-${i}`}
                className={`flex-shrink-0 ${
                  isMobile ? 'w-[calc(50vw-24px)]' : 'w-[220px] md:w-[260px] lg:w-[280px]'
                }`}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center mt-10 md:hidden">
          <a
            href="/search"
            className="px-8 py-3 bg-primary text-white text-[11px] font-semibold tracking-[0.2em] uppercase hover:bg-primary-light transition-colors"
          >
            Voir tout
          </a>
        </div>
      </div>
    </section>
  )
}
