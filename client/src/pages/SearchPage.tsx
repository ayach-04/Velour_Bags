import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { HiMagnifyingGlass, HiXMark, HiChevronDown, HiCheck, HiAdjustmentsHorizontal } from 'react-icons/hi2'
import { fetchFamilles, fetchCategories } from '../api/categories'
import ProductCard from '../components/ProductCard'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const PER_PAGE = 24

const sortOptions = [
  { value: 'default', label: 'Pertinence' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix decroissant' },
  { value: 'name-asc', label: 'Nom A-Z' },
  { value: 'name-desc', label: 'Nom Z-A' },
  { value: 'newest', label: 'Nouveautes' },
]

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const familleParam = searchParams.get('famille') || ''
  const categoryParam = searchParams.get('category') || ''

  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('default')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedFamilles, setSelectedFamilles] = useState<string[]>(familleParam ? [familleParam] : [])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categoryParam ? [categoryParam] : [])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [dbFamilles, setDbFamilles] = useState<any[]>([])
  const [dbCategories, setDbCategories] = useState<any[]>([])
  const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

  useEffect(() => {
    fetch(`${API_BASE}/api/products`)
      .then(res => res.json())
      .then(data => { if (data.length) setAllProducts(data) })
      .catch(() => {})

    fetchFamilles().then(setDbFamilles).catch(() => {})
    fetchCategories().then(setDbCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setSelectedFamilles(familleParam ? [familleParam] : [])
  }, [familleParam])

  useEffect(() => {
    setSelectedCategories(categoryParam ? [categoryParam] : [])
  }, [categoryParam])

  const allFamilleNames = useMemo(() => dbFamilles.map((f: any) => f.name).sort(), [dbFamilles])

  const allCategoryNames = useMemo(() => {
    if (selectedFamilles.length > 0) {
      const familleIds = dbFamilles.filter((f: any) => selectedFamilles.includes(f.name)).map((f: any) => String(f._id))
      return dbCategories.filter((c: any) => {
        const fid = typeof c.familleId === 'object' && c.familleId !== null ? String(c.familleId._id) : String(c.familleId)
        return familleIds.includes(fid)
      }).map((c: any) => c.name).sort()
    }
    return [...new Set(allProducts.filter((p: any) => p.published !== false).map((p: any) => p.brand).filter(Boolean))].sort()
  }, [allProducts, dbFamilles, dbCategories, selectedFamilles])

  const toggleFamille = (f: string) => {
    setSelectedFamilles(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
    setPage(1)
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
    setPage(1)
  }

  const clearFilters = () => {
    setSelectedFamilles([])
    setSelectedCategories([])
    setMinPrice('')
    setMaxPrice('')
    setSortBy('default')
    setPage(1)
    setSearchParams({}, { replace: true })
  }

  const hasActiveFilters = selectedFamilles.length > 0 || selectedCategories.length > 0 || minPrice !== '' || maxPrice !== '' || sortBy !== 'default'

  const title = familleParam
    ? familleParam
    : categoryParam
    ? categoryParam
    : q
    ? `"${q}"`
    : 'Tous les produits'

  const results = useMemo(() => {
    let filtered = (allProducts as any[]).filter((p: any) => p.published !== false)

    if (q) {
      const query = q.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.brand || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query)
      )
    }

    if (selectedFamilles.length > 0) {
      filtered = filtered.filter(p => selectedFamilles.includes(p.category))
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => selectedCategories.includes(p.brand))
    }

    if (minPrice !== '') filtered = filtered.filter(p => p.price >= Number(minPrice))
    if (maxPrice !== '') filtered = filtered.filter(p => p.price <= Number(maxPrice))

    switch (sortBy) {
      case 'price-asc': filtered.sort((a, b) => a.price - b.price); break
      case 'price-desc': filtered.sort((a, b) => b.price - a.price); break
      case 'name-asc': filtered.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'name-desc': filtered.sort((a, b) => b.name.localeCompare(a.name)); break
      case 'newest': filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break
    }

    return filtered
  }, [allProducts, q, dbFamilles, dbCategories, selectedFamilles, selectedCategories, minPrice, maxPrice, sortBy])

  const totalPages = Math.ceil(results.length / PER_PAGE)
  const pageResults = results.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 overflow-x-hidden bg-white">
        <div className="max-w-[1360px] mx-auto px-5 md:px-6 pt-6 pb-20">

          {/* Breadcrumb */}
          <nav className="flex lg:hidden items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400 mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-foreground">{title}</span>
          </nav>

          <nav className="hidden lg:flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400 mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-foreground">{title}</span>
          </nav>

          {/* Page Title */}
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-8">
            {title}
          </h1>

          {/* Search + Toolbar */}
          <div className="flex items-center gap-4 mb-6">
            {/* Search Bar */}
            <div className="relative flex-1">
              <HiMagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={q}
                onChange={(e) => {
                  const val = e.target.value
                  const next = new URLSearchParams(searchParams)
                  if (val) next.set('q', val)
                  else next.delete('q')
                  setSearchParams(next, { replace: true })
                  setPage(1)
                }}
                className="w-full pl-10 pr-4 py-2.5 text-[13px] font-sans border border-gray-200 focus:outline-none focus:border-foreground transition-colors"
              />
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-sans font-medium uppercase tracking-[0.1em] text-foreground border border-gray-200 hover:border-foreground transition-colors cursor-pointer shrink-0"
            >
              <HiAdjustmentsHorizontal size={14} />
              Filtres
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>

            {/* Sort */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
                className="appearance-none pl-3 pr-8 py-2.5 text-[11px] font-sans font-medium uppercase tracking-[0.1em] text-foreground border border-gray-200 cursor-pointer focus:outline-none focus:border-foreground transition-colors"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <HiChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {selectedFamilles.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFamille(f)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-sans font-medium uppercase tracking-[0.05em] bg-foreground text-background transition-colors cursor-pointer"
                >
                  {f}
                  <HiXMark size={12} />
                </button>
              ))}
              {selectedCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-sans font-medium uppercase tracking-[0.05em] bg-foreground text-background transition-colors cursor-pointer"
                >
                  {cat}
                  <HiXMark size={12} />
                </button>
              ))}
              {(minPrice || maxPrice) && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-sans font-medium uppercase tracking-[0.05em] bg-foreground text-background">
                  {minPrice ? `${minPrice} DA - ` : ''}{maxPrice ? `${maxPrice} DA` : ''}
                  <button onClick={() => { setMinPrice(''); setMaxPrice(''); setPage(1) }}>
                    <HiXMark size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-[11px] font-sans font-medium uppercase tracking-[0.05em] text-gray-400 hover:text-foreground transition-colors cursor-pointer"
              >
                Tout effacer
              </button>
            </div>
          )}

          {/* Results Count */}
          <p className="text-[11px] font-sans text-gray-400 uppercase tracking-[0.1em] mb-6">
            {results.length} produit{results.length !== 1 ? 's' : ''}
          </p>

          {/* Product Grid */}
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <HiMagnifyingGlass size={40} className="text-gray-200 mb-4" />
              <p className="font-display text-xl text-foreground mb-1">Aucun produit</p>
              <p className="text-[13px] text-gray-400">Essayez de modifier vos criteres de recherche</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8">
                {pageResults.map(product => (
                  <ProductCard key={(product as any)._id || product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-14">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-5 py-2.5 text-[11px] font-sans font-medium uppercase tracking-[0.1em] text-foreground border border-gray-200 hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Precedent
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 flex items-center justify-center text-[12px] font-sans cursor-pointer transition-colors ${
                          p === page
                            ? 'bg-foreground text-background'
                            : 'text-foreground hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-5 py-2.5 text-[11px] font-sans font-medium uppercase tracking-[0.1em] text-foreground border border-gray-200 hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Filter Drawer */}
      <>
        <div
          className={`fixed inset-0 bg-black/40 z-[1000] transition-opacity duration-300 ease-in ${
            filterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setFilterOpen(false)}
        />
        <div
          className={`fixed top-0 left-0 h-[100dvh] w-[340px] max-w-[85vw] bg-white z-[1001] flex flex-col transition-transform duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            filterOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-5">
              <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.15em] text-foreground">Filtres</span>
              <button
                className="cursor-pointer text-foreground p-1 hover:bg-gray-100 flex items-center justify-center transition-colors"
                onClick={() => setFilterOpen(false)}
              >
                <HiXMark size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
            {/* Familles */}
            {allFamilleNames.length > 0 && (
              <div>
                <h4 className="text-[11px] font-sans font-semibold uppercase tracking-[0.15em] text-foreground mb-3">Categories</h4>
                <div className="space-y-2.5">
                  {allFamilleNames.map(f => {
                    const checked = selectedFamilles.includes(f)
                    return (
                      <label key={f} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => toggleFamille(f)}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${checked ? 'bg-foreground border-foreground' : 'border-gray-300 bg-white'}`}>
                          {checked && <HiCheck size={11} className="text-white" />}
                        </div>
                        <span className="text-[13px] font-sans text-gray-500 group-hover:text-foreground transition-colors">{f}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sub-categories */}
            {allCategoryNames.length > 0 && (
              <div>
                <h4 className="text-[11px] font-sans font-semibold uppercase tracking-[0.15em] text-foreground mb-3">Sous-categories</h4>
                <div className="space-y-2.5">
                  {allCategoryNames.map(cat => {
                    const checked = selectedCategories.includes(cat)
                    return (
                      <label key={cat} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => toggleCategory(cat)}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${checked ? 'bg-foreground border-foreground' : 'border-gray-300 bg-white'}`}>
                          {checked && <HiCheck size={11} className="text-white" />}
                        </div>
                        <span className="text-[13px] font-sans text-gray-500 group-hover:text-foreground transition-colors">{cat}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Price Range */}
            <div>
              <h4 className="text-[11px] font-sans font-semibold uppercase tracking-[0.15em] text-foreground mb-3">Prix</h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full px-3 py-2.5 text-[13px] font-sans border border-gray-200 focus:outline-none focus:border-foreground transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-gray-300 text-sm">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full px-3 py-2.5 text-[13px] font-sans border border-gray-200 focus:outline-none focus:border-foreground transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4">
            <button
              onClick={() => { clearFilters(); setFilterOpen(false) }}
              className="w-full py-3 text-[11px] font-sans font-medium uppercase tracking-[0.1em] text-foreground border border-gray-200 hover:border-foreground transition-colors cursor-pointer"
            >
              Reinitialiser
            </button>
          </div>
        </div>
      </>
    </div>
  )
}
