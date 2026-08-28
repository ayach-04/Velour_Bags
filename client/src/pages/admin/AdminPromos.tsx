import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiCheck, HiMagnifyingGlass, HiTag, HiChevronLeft, HiChevronRight, HiSquares2X2 } from 'react-icons/hi2'
import AutocompleteInput from '../../components/AutocompleteInput'
import { fetchFamilles } from '../../api/categories'

const API_BASE = import.meta.env.DEV ? '' : import.meta.env.VITE_API_URL

interface DbProduct { _id: string; name: string; category: string; brand?: string; price: number; image: string; oldPrice?: number; label?: string }

const modeMeta = {
  reduction: { label: 'Réduction (%)', short: 'remise en %', shortMobile: 'Remise %', placeholder: '20', suffix: '%' },
  fixed: { label: 'Réduction (DA)', short: 'remise en DA', shortMobile: 'Remise DA', placeholder: '500', suffix: 'DA' },
  price: { label: 'Nouveau prix', short: 'prix fixe', shortMobile: 'Prix fixe', placeholder: '1500', suffix: 'DA' },
} as const

export default function AdminPromos() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<DbProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [familleNames, setFamilleNames] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [promoMode, setPromoMode] = useState<'reduction' | 'fixed' | 'price'>('reduction')
  const [promoValue, setPromoValue] = useState('20')
  const [applying, setApplying] = useState(false)
  const [success, setSuccess] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 20

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/products`).then(r => r.json()),
      fetchFamilles().then(f => f.filter(x => x.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(x => x.name)),
    ])
      .then(([prods, cats]) => { setProducts(prods); setFamilleNames(cats) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const cats = selectedCategories ? selectedCategories.split(',').map(s => s.trim()).filter(Boolean) : []
    return products.filter(p => {
      if (cats.length > 0 && !cats.includes(p.category)) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [search, selectedCategories, products])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length

  const calcPrice = (original: number) => {
    if (!promoValue) return original
    const v = Number(promoValue)
    if (promoMode === 'reduction') return Math.round(original * (1 - Math.min(v, 100) / 100))
    if (promoMode === 'fixed') return Math.max(0, original - v)
    return Math.min(v, original)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : filtered.map(p => p._id))
  }

  const applyPromo = async () => {
    setApplying(true)
    setSuccess('')
    try {
      const toUpdate = products.filter(p => selectedIds.includes(p._id))
      const token = localStorage.getItem('admin_token')
      if (!token) { navigate('/admin'); return }

      for (const product of toUpdate) {
        const originalPrice = Number(product.price) || 0
        const finalPrice = calcPrice(originalPrice)

        const body: Record<string, any> = {
          price: finalPrice,
          oldPrice: finalPrice < originalPrice ? originalPrice : undefined,
          label: finalPrice < originalPrice ? 'PROMO' : undefined,
        }

        const res = await fetch(`${API_BASE}/api/products/${product._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        if (res.status === 401) { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_token_exp'); window.location.href = '/admin'; return }
        if (!res.ok) throw new Error(`Erreur sur ${product.name}`)
      }

      setSuccess(`${selectedIds.length} produit(s) mis en promo avec succès`)
      setSelectedIds([])
    } catch (err: any) {
      setSuccess(`Erreur : ${err.message}`)
    } finally {
      setApplying(false)
    }
  }

  const isError = success.startsWith('Erreur')

  return (
    <div>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Gérer les promos</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{products.length} produits au total</p>
          </div>
        </div>
      </div>

      {/* Result banner */}
      {success && (
        <div className={`mb-4 px-4 py-3 text-sm rounded-xl border ${isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {success}
        </div>
      )}

      {/* Config card */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden mb-4">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HiTag size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">Paramètres de la promotion</p>
              <p className="text-xs text-gray-400 truncate">Choisissez le mode puis la valeur à appliquer</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-5 max-w-sm">
          {/* Mode */}
          <div className="w-full">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mode de réduction</span>
            <div className="flex w-full p-1 bg-gray-100 rounded-xl gap-0.5">
              {(Object.keys(modeMeta) as Array<'reduction' | 'fixed' | 'price'>).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setPromoMode(mode); setPromoValue(mode === 'reduction' ? '20' : '') }}
                  className={`flex-1 px-3 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                    promoMode === mode ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-text'
                  }`}
                >
                  <span className="sm:hidden">{modeMeta[mode].shortMobile}</span>
                  <span className="hidden sm:inline">{modeMeta[mode].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Value */}
          <div className="w-full">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Valeur</span>
            <div className="relative">
              <input
                type="number"
                value={promoValue}
                onChange={(e) => setPromoValue(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder={promoMode === 'reduction' ? '20' : promoMode === 'fixed' ? '500' : '1500'}
                className="w-full h-11 pl-4 pr-14 bg-gray-50 border border-gray-200 text-sm font-medium text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all rounded-xl"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                {promoMode === 'reduction' ? '%' : 'DA'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              {promoMode === 'price' ? 'Le prix fixe remplace le prix actuel' : `Applique une ${modeMeta[promoMode].short} à chaque produit`}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">Rechercher</label>
          <div className="relative">
            <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Rechercher un produit..."
              className="w-full h-[42px] pl-9 pr-4 bg-white border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary transition-all rounded-xl"
            />
          </div>
        </div>
        <AutocompleteInput
          name="categories"
          label="Filtrer par catégorie"
          value={selectedCategories}
          onChange={(v) => { setSelectedCategories(v); setPage(1) }}
          options={familleNames}
          placeholder="Toutes les catégories"
          multiple
          disableInput
          openUp
        />
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-between gap-3 px-1 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <HiTag size={14} className={`shrink-0 ${selectedIds.length > 0 ? 'text-primary' : 'text-gray-300'}`} />
          <span className={`text-xs font-medium truncate ${selectedIds.length > 0 ? 'text-text' : 'text-gray-400'}`}>
            {selectedIds.length > 0 ? `${selectedIds.length} produit${selectedIds.length !== 1 ? 's' : ''} sélectionné${selectedIds.length !== 1 ? 's' : ''}` : 'Sélectionnez les produits à promouvoir'}
          </span>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={toggleAll}
            className="text-xs font-semibold text-primary hover:text-text transition-colors cursor-pointer whitespace-nowrap"
          >
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        )}
      </div>

      {/* Products list */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden mb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <HiSquares2X2 size={20} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Aucun produit trouvé</p>
            <p className="text-xs text-gray-400">Ajustez la recherche ou les filtres</p>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gray-50/60 border-b border-gray-100">
              <button onClick={toggleAll} className={`w-5 h-5 flex items-center justify-center border rounded-md transition-all cursor-pointer shrink-0 ${allSelected ? 'bg-primary border-primary' : 'bg-white border-gray-300 hover:border-primary'}`}>
                {allSelected && <HiCheck size={10} className="text-white" />}
              </button>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {filtered.length} produit{filtered.length !== 1 ? 's' : ''} · {page} / {totalPages}
              </span>
            </div>

            {/* Rows */}
            {paginated.map(product => {
              const selected = selectedIds.includes(product._id)
              const newPrice = calcPrice(product.price)
              const onPromo = newPrice < product.price
              return (
                <div
                  key={product._id}
                  onClick={() => toggleSelect(product._id)}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-3 transition-colors cursor-pointer ${selected ? 'bg-primary/5' : 'hover:bg-gray-50/80'}`}
                >
                  <div className={`w-5 h-5 flex items-center justify-center border rounded-md transition-all shrink-0 ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                    {selected && <HiCheck size={10} className="text-white" />}
                  </div>
                  <img
                    src={product.image}
                    alt=""
                    className="w-11 h-11 object-cover bg-gray-100 shrink-0 rounded-xl"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 truncate">{product.category}{product.brand ? ` · ${product.brand}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {onPromo ? (
                      <>
                        <p className="text-xs text-gray-400 line-through tabular-nums">{Math.round(product.price).toLocaleString()} DA</p>
                        <p className="text-sm font-semibold text-primary tabular-nums">{newPrice.toLocaleString()} DA</p>
                      </>
                    ) : (
                      <p className="text-sm text-text tabular-nums">{Math.round(product.price).toLocaleString()} DA</p>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 border-t border-gray-100 bg-gray-50/60">
                <span className="text-xs text-gray-500">
                  Page <span className="font-medium text-gray-700">{page}</span> sur {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-text hover:bg-white border border-transparent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all rounded-lg"
                  >
                    <HiChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1 overflow-x-auto max-w-[170px] sm:max-w-none">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[30px] h-8 px-1 text-xs font-medium cursor-pointer transition-all rounded-lg ${
                          p === page ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 hover:text-text hover:bg-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-text hover:bg-white border border-transparent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all rounded-lg"
                  >
                    <HiChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom action bar */}
      {selectedIds.length > 0 && (
        <>
          <div className="h-20" />
          <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-20 bg-white border-t border-gray-200 px-4 md:px-6 lg:px-8 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-2 max-w-4xl mx-auto">
              <span className="text-sm font-medium text-text">
                {selectedIds.length} produit{selectedIds.length !== 1 ? 's' : ''} concerné{selectedIds.length !== 1 ? 's' : ''}
              </span>
              <div className="flex w-full sm:w-auto items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="flex-1 sm:flex-none h-10 px-5 text-sm font-medium text-gray-500 hover:text-text hover:bg-gray-100 transition-all cursor-pointer rounded-xl"
                >
                  Annuler
                </button>
                <button
                  onClick={applyPromo}
                  disabled={applying || !promoValue}
                  className="flex-1 sm:flex-none h-10 px-6 bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl"
                >
                  {applying ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <HiCheck size={14} />}
                  <span className="sm:hidden whitespace-nowrap">{applying ? 'Application...' : 'Appliquer'}</span>
                  <span className="hidden sm:inline whitespace-nowrap">{applying ? 'Application...' : 'Appliquer la promo'}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}