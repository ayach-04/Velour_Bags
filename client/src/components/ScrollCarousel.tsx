import { useRef, useState, useEffect } from 'react'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2'

interface ScrollCarouselProps {
  children: React.ReactNode
  className?: string
  columns?: number
}

export default function ScrollCarousel({ children, className = '', columns = 5 }: ScrollCarouselProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const updateArrows = () => {
    const el = ref.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)

    const el = ref.current
    if (el) {
      el.addEventListener('scroll', updateArrows, { passive: true })
      updateArrows()
    }
    window.addEventListener('resize', updateArrows)
    return () => {
      mq.removeEventListener('change', handler)
      el?.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    const el = ref.current
    if (!el) return
    const w = el.clientWidth * 0.7
    el.scrollBy({ left: dir === 'left' ? -w : w, behavior: 'smooth' })
  }

  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-4 md:pb-0"
        style={{
          scrollbarWidth: 'none',
          ...(isDesktop ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: '1.5rem' } : {}),
        }}
      >
        {children}
      </div>

      {canScrollLeft && hovered && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-10 h-10 rounded-full bg-white items-center justify-center border border-border hover:bg-gray-100 transition-colors cursor-pointer text-foreground"
          aria-label="Scroll left"
        >
          <HiChevronLeft size={18} strokeWidth={1.5} />
        </button>
      )}
      {canScrollRight && hovered && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-10 h-10 rounded-full bg-white items-center justify-center border border-border hover:bg-gray-100 transition-colors cursor-pointer text-foreground"
          aria-label="Scroll right"
        >
          <HiChevronRight size={18} strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}
