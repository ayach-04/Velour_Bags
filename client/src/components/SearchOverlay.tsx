import { useEffect, useRef, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HiMagnifyingGlass, HiXMark, HiChevronRight } from 'react-icons/hi2'
import { getCachedProducts, refreshProducts } from '../api/catalog'
import { getDisplayVolumeInfo } from '../utils/product'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  const results = useMemo(() => {
    if (!debounced.trim()) return []
    const q = debounced.toLowerCase()
    return getCachedProducts()
      .filter(p =>
        p.published !== false &&
        (p.name.toLowerCase().includes(q) ||
         p.category.toLowerCase().includes(q) ||
         (p.brand || '').toLowerCase().includes(q))
      )
      .slice(0, 8)
  }, [debounced])

  useEffect(() => {
    refreshProducts().catch(() => {})
  }, [])

  const handleClear = () => {
    setQuery('')
    setDebounced('')
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setDebounced('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  return (
    <div
      className={`fixed inset-0 z-[1000] transition-all duration-300 ease-in ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="absolute inset-0 bg-white" />
      <div className="relative z-10 flex flex-col items-center pt-[10vh] px-4" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-lg">
          <div className="flex items-center border-b-2 border-border pb-3">
            <HiMagnifyingGlass size={20} className="text-muted-foreground/40 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="flex-1 ml-3 text-lg text-foreground outline-none bg-transparent placeholder:text-muted-foreground/30"
            />
            {query && (
              <button
                className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground ml-3 tracking-wider uppercase transition-colors"
                onClick={handleClear}
              >
                Effacer
              </button>
            )}
          </div>

          {debounced && (
            <div className="mt-4 space-y-1 max-h-[50vh] overflow-y-auto">
              {results.length === 0 && (
                <p className="text-sm text-muted-foreground/50 py-6 text-center">Aucun resultat</p>
              )}
              <Link
                to={`/search?q=${encodeURIComponent(debounced)}`}
                onClick={onClose}
                className="flex items-center justify-between px-3 py-2.5 text-[13px] font-semibold text-accent hover:bg-accent/5 transition-colors"
              >
                Voir tous les resultats
                <HiChevronRight size={16} />
              </Link>
              {results.map(product => {
                const info = getDisplayVolumeInfo(product)
                const multi = product.volumes && product.volumes.length > 1
                const onPromo = info.base != null && info.base > info.price
                return (
                <Link
                  key={product.id || (product as any)._id}
                  to={`/product/${product.id || (product as any)._id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 hover:bg-card transition-colors"
                >
                  <div className="w-12 h-12 bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    <img
                      src={product.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{product.category}{product.brand ? ` · ${product.brand}` : ''}</p>
                  </div>
                  <div className="text-[13px] font-semibold text-foreground shrink-0">
                    {onPromo && (
                      <span className="text-[11px] text-muted-foreground line-through mr-1">{info.base!.toLocaleString()} DA</span>
                    )}
                    {multi && !onPromo
                      ? `Des ${Math.round(info.price)} DA`
                      : `${info.price.toLocaleString()} DA`}
                  </div>
                </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <button
        className="absolute top-5 right-5 z-20 cursor-pointer text-muted-foreground/40 hover:text-foreground p-2 transition-colors"
        onClick={onClose}
      >
        <HiXMark size={28} />
      </button>
    </div>
  )
}

export default SearchOverlay
