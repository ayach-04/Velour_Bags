import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiPencil, HiTrash, HiMagnifyingGlass, HiChevronLeft, HiChevronRight, HiFunnel, HiCheck, HiEye, HiArrowPath } from 'react-icons/hi2'
import { fetchProducts, deleteProduct, bulkDeleteProducts, updateProduct, type Product } from '../../api/products'
import { isProductNew } from '../../utils/product'
import ConfirmDialog from '../../components/ConfirmDialog'
import Modal from '../../components/Modal'
import Select from '../../components/Select'

type SortField = 'name' | 'price' | 'stock' | 'createdAt'
type SortDir = 'asc' | 'desc'

const totalStock = (product: Product): number => {
  if (product.colors && product.colors.length > 0) {
    return product.colors.reduce((sum, c) => sum + (c.stock ?? 0), 0)
  }
  return product.stock ?? 0
}

const priceRange = (product: Product) => {
  if (product.colors && product.colors.length > 1) {
    const prices = product.colors.map(c => c.price).filter(Boolean)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    if (min !== max) return { min, max }
  }
  return null
}

const lowestPrice = (product: Product): number => {
  if (product.colors && product.colors.length > 0) {
    return Math.min(...product.colors.map(c => c.price).filter(Boolean))
  }
  return product.price
}

export default function AdminProducts() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [familleFilter, setFamilleFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchProducts()
      setProducts(data)
    } catch {} finally {
      setLoading(false)
    }
  }

  const familles = useMemo(() => {
    const s = new Set(products.map(p => p.category).filter(Boolean))
    return [...s].sort()
  }, [products])

  const subCategories = useMemo(() => {
    const s = new Set(products.map(p => p.brand).filter((v): v is string => !!v))
    return [...s].sort()
  }, [products])

  const allColors = useMemo(() => {
    const s = new Set<string>()
    products.forEach(p => p.colors?.forEach(c => { if (c.name) s.add(c.name) }))
    return [...s].sort()
  }, [products])

  const filtered = useMemo(() => {
    let result = [...products]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      )
    }

    if (familleFilter) result = result.filter(p => p.category === familleFilter)
    if (categoryFilter) result = result.filter(p => p.brand === categoryFilter)
    if (colorFilter) result = result.filter(p => p.colors?.some(c => c.name === colorFilter))
    if (statusFilter === 'published') result = result.filter(p => p.published !== false)
    if (statusFilter === 'draft') result = result.filter(p => p.published === false)

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortField === 'price') cmp = lowestPrice(a) - lowestPrice(b)
      else if (sortField === 'stock') cmp = totalStock(a) - totalStock(b)
      else if (sortField === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [search, familleFilter, categoryFilter, colorFilter, statusFilter, sortField, sortDir, products])

  useEffect(() => { setPage(1) }, [search, familleFilter, categoryFilter, colorFilter, statusFilter])

  const PER_PAGE = 15
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length
  const selectedProducts = useMemo(() => products.filter(p => selectedIds.includes(p._id)), [products, selectedIds])
  const allActive = selectedProducts.length > 0 && selectedProducts.every(p => p.published !== false)
  const allInactive = selectedProducts.length > 0 && selectedProducts.every(p => p.published === false)

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll = () => setSelectedIds(allSelected ? [] : filtered.map(p => p._id))

  const bulkTogglePublished = async (publish: boolean) => {
    try {
      await Promise.all(selectedIds.map(id => updateProduct(id, { published: publish })))
      setProducts(prev => prev.map(p => selectedIds.includes(p._id) ? { ...p, published: publish } : p))
      setSelectedIds([])
    } catch {}
  }

  const handleDelete = (id: string, name: string) => setConfirmDelete({ id, name })

  const confirmDeleteProduct = async () => {
    if (confirmDelete) {
      try {
        await deleteProduct(confirmDelete.id)
        setProducts(prev => prev.filter(p => p._id !== confirmDelete.id))
        setSelectedIds(prev => prev.filter(x => x !== confirmDelete.id))
      } catch {}
      setConfirmDelete(null)
    }
  }

  const confirmBulkDelete = async () => {
    try {
      await bulkDeleteProducts(selectedIds)
      setProducts(prev => prev.filter(p => !selectedIds.includes(p._id)))
      setSelectedIds([])
    } catch {}
    setBulkDeleteConfirm(false)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-primary ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const formatDate = (d: string) => {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const ColorDots = ({ product }: { product: Product }) => {
    const colors = product.colors?.filter(c => c.name) ?? []
    if (colors.length === 0) return <span className="text-gray-300 text-xs">—</span>
    return (
      <div className="flex items-center gap-0.5 flex-wrap">
        {colors.slice(0, 6).map((c, i) => (
          <div
            key={i}
            className="w-3.5 h-3.5 rounded-full ring-1 ring-gray-200 shrink-0"
            style={{ backgroundColor: c.name }}
            title={c.name}
          />
        ))}
        {colors.length > 6 && <span className="text-[10px] text-gray-400 ml-0.5">+{colors.length - 6}</span>}
      </div>
    )
  }

  const StockBadge = ({ product }: { product: Product }) => {
    const stock = totalStock(product)
    if (stock === 0) return <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-500 rounded-full border border-red-100">Épuisé</span>
    if (stock <= 5) return <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">{stock} restant{stock > 1 ? 's' : ''}</span>
    return <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">{stock} en stock</span>
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 py-3 min-h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Produits</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-full text-white md:text-gray-400 bg-white/10 md:bg-transparent border border-white/15 md:border-transparent backdrop-blur-md md:backdrop-blur-none hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer" title="Actualiser">
              <HiArrowPath size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="-mx-2 md:-mx-4 lg:-mx-6 px-2 md:px-4 lg:px-6 pb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="flex items-center gap-2 pt-3 pb-0">
          <HiFunnel size={13} className="text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Filtres</span>
        </div>
        <div className="pt-3">
          <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
            <div className="relative w-full md:flex-1 md:min-w-[260px] md:max-w-md">
              <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, famille, catégorie..."
                className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:items-center md:gap-3 md:w-auto">
              <div className="w-full md:w-40">
                <Select value={familleFilter} onChange={setFamilleFilter} options={['', ...familles]} placeholder="Catégories" formatOption={(v) => v || 'Catégories'} />
              </div>
              <div className="w-full md:w-44">
                <Select value={categoryFilter} onChange={setCategoryFilter} options={['', ...subCategories]} placeholder="Sous-catégories" formatOption={(v) => v || 'Sous-catégories'} />
              </div>
              <div className="w-full md:w-36">
                <Select
                  value={colorFilter}
                  onChange={setColorFilter}
                  options={['', ...allColors]}
                  placeholder="Toutes couleurs"
                  renderOption={(option, isSelected) => option ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full ring-1 ring-gray-200 shrink-0" style={{ backgroundColor: option }} />
                      <span>{option}</span>
                      {isSelected && <HiCheck size={12} className="text-primary ml-auto" />}
                    </div>
                  ) : 'Toutes couleurs'
                  }
                />
              </div>
              <div className="w-full md:w-36">
                <Select value={statusFilter} onChange={setStatusFilter} options={['', 'published', 'draft']} placeholder="Tous les statuts" formatOption={(v) => v ? (v === 'published' ? 'Publié' : 'Brouillon') : 'Tous les statuts'} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="-mx-2 md:-mx-4 lg:-mx-6 px-2 md:px-4 lg:px-6 bg-white border border-gray-100 shadow-sm mt-4 rounded-2xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="pr-2 py-3.5 w-8">
                  <button onClick={toggleAll} className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer rounded-md ${allSelected ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                    {allSelected && <HiCheck size={10} className="text-white" />}
                  </button>
                </th>
                <th className="px-2 py-3.5 cursor-pointer select-none hover:text-primary transition-colors" onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">Produit <SortIcon field="name" /></span>
                </th>
                <th className="px-2 py-3.5">Famille</th>
                <th className="px-2 py-3.5">Catégorie</th>
                <th className="px-2 py-3.5">Couleurs</th>
                <th className="px-2 py-3.5 cursor-pointer select-none hover:text-primary transition-colors" onClick={() => toggleSort('price')}>
                  <span className="flex items-center gap-1">Prix <SortIcon field="price" /></span>
                </th>
                <th className="px-2 py-3.5 cursor-pointer select-none hover:text-primary transition-colors" onClick={() => toggleSort('stock')}>
                  <span className="flex items-center gap-1">Stock <SortIcon field="stock" /></span>
                </th>
                <th className="px-2 py-3.5">Statut</th>
                <th className="pr-4 pl-2 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {paginated.map((product, i) => {
                const selected = selectedIds.includes(product._id)
                const stock = totalStock(product)
                const range = priceRange(product)
                const price = lowestPrice(product)
                return (
                <tr key={product._id} className={`transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-blue-50/30 ${selected ? 'bg-primary/5' : ''}`} onClick={() => setViewProduct(product)}>
                  <td className="pr-2 py-3">
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(product._id) }} className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer rounded-md ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                      {selected && <HiCheck size={10} className="text-white" />}
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 shrink-0 overflow-hidden ring-1 ring-gray-200/50 rounded-lg">
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <span className={`font-medium text-[13px] truncate block ${product.published === false ? 'text-gray-400' : 'text-gray-800'}`}>{product.name}</span>
                        {product.brand && <span className="text-[11px] text-gray-400 truncate block">{product.brand}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <span className="text-[12px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{product.category}</span>
                  </td>
                  <td className="px-2 py-3">
                    <span className="text-[12px] text-gray-500">{product.brand || <span className="text-gray-300">—</span>}</span>
                  </td>
                  <td className="px-2 py-3">
                    <ColorDots product={product} />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col">
                      {range ? (
                        <>
                          <span className="text-[10px] text-gray-400 line-through">{Math.round(range.max)} DA</span>
                          <span className="font-medium text-gray-800 tabular-nums text-[13px]">{Math.round(range.min)} DA +</span>
                        </>
                      ) : (
                        <span className="font-medium text-gray-800 tabular-nums text-[13px]">{Math.round(price)} DA</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <StockBadge product={product} />
                  </td>
                  <td className="px-2 py-3">
                    <button onClick={(e) => { e.stopPropagation(); updateProduct(product._id, { published: product.published === false }).then(() => setProducts(prev => prev.map(p => p._id === product._id ? { ...p, published: p.published === false } : p))) }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${product.published !== false ? 'bg-primary' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${product.published !== false ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </td>
                  <td className="pr-4 pl-2 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); setViewProduct(product) }} className="p-1.5 text-gray-300 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Voir">
                        <HiEye size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/products/edit/${product.id || product._id}`) }} className="p-1.5 text-gray-300 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Modifier">
                        <HiPencil size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(product._id, product.name) }} className="p-1.5 text-gray-300 hover:text-foreground hover:bg-foreground/10 transition-all cursor-pointer rounded-md" title="Supprimer">
                        <HiTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          )}

          {filtered.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HiMagnifyingGlass size={36} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">Aucun produit trouvé</p>
              <p className="text-xs text-gray-400">Essayez de modifier vos filtres</p>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        {loading ? (
          <div className="md:hidden flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="md:hidden divide-y divide-gray-100/80">
            {paginated.map((product) => {
              const selected = selectedIds.includes(product._id)
              const stock = totalStock(product)
              const price = lowestPrice(product)
              return (
                <div key={product._id} className={`px-3 py-3 transition-colors ${selected ? 'bg-primary/5' : ''}`} onClick={() => setViewProduct(product)}>
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(product._id) }} className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer rounded-md shrink-0 ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                      {selected && <HiCheck size={10} className="text-white" />}
                    </button>
                    <div className="w-12 h-12 bg-gray-100 shrink-0 overflow-hidden ring-1 ring-gray-200/50 rounded-lg">
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-medium text-sm truncate ${product.published === false ? 'text-gray-400' : 'text-gray-800'}`}>{product.name}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {product.category}{product.brand ? ` · ${product.brand}` : ''}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="font-bold text-gray-800 text-sm tabular-nums">{Math.round(price)} DA</span>
                        <StockBadge product={product} />
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <ColorDots product={product} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-0.5 mt-2 pl-8">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/products/edit/${product.id || product._id}`) }} className="p-1.5 text-gray-300 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Modifier">
                      <HiPencil size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(product._id, product.name) }} className="p-1.5 text-gray-300 hover:text-foreground hover:bg-foreground/10 transition-all cursor-pointer rounded-md" title="Supprimer">
                      <HiTrash size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <HiMagnifyingGlass size={36} className="text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-500 mb-1">Aucun produit trouvé</p>
                <p className="text-xs text-gray-400">Essayez de modifier vos filtres</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between py-3 border-t border-gray-100 bg-gray-50/50">
          <span className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{filtered.length}</span> produit{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all rounded-md border border-transparent hover:border-gray-200">
              <HiChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-0.5 overflow-x-auto max-w-[170px] sm:max-w-none">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`min-w-[26px] md:min-w-[30px] h-7 text-xs font-medium cursor-pointer transition-all rounded-md ${p === page ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-700'}`}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all rounded-md border border-transparent hover:border-gray-200">
              <HiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <>
          <div className="h-16" />
          <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-20 bg-white border-t border-gray-200 px-4 md:px-6 lg:px-8 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-text">
                {selectedIds.length} produit{selectedIds.length !== 1 ? 's' : ''} sélectionné{selectedIds.length !== 1 ? 's' : ''}
              </span>
              <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
                <button onClick={() => setSelectedIds([])} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-text hover:bg-gray-100 transition-all cursor-pointer rounded-lg">
                  Annuler
                </button>
                {allActive && (
                  <button onClick={() => bulkTogglePublished(false)} className="h-9 px-4 bg-foreground/10 hover:bg-foreground/20 text-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 rounded-lg">
                    Désactiver
                  </button>
                )}
                {allInactive && (
                  <button onClick={() => bulkTogglePublished(true)} className="h-9 px-4 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 rounded-lg">
                    Activer
                  </button>
                )}
                <button onClick={() => setBulkDeleteConfirm(true)} className="h-9 px-4 bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center gap-1.5 rounded-lg">
                  <HiTrash size={14} /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View modal */}
      <Modal open={viewProduct !== null} onClose={() => setViewProduct(null)} title={
        viewProduct ? (
          <div className="flex items-center gap-2">
            <span>{viewProduct.name}</span>
            <button onClick={() => { const p = viewProduct; setViewProduct(null); navigate(`/admin/products/edit/${p.id || p._id}`) }} className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer" title="Modifier">
              <HiPencil size={13} />
            </button>
          </div>
        ) : ''
      } className="lg:ml-64" maxWidth="max-w-2xl">
        {viewProduct && (
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 flex gap-4">
                <div className="w-28 h-28 bg-gray-100 shrink-0 overflow-hidden ring-1 ring-gray-200/50 rounded-lg">
                  <img src={viewProduct.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {isProductNew(viewProduct) && <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 border border-primary/20 rounded-full">NEW</span>}
                    {viewProduct.label === 'PROMO' && <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 border border-primary/20 rounded-full">PROMO</span>}
                    {viewProduct.label === 'OUT_OF_STOCK' && <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ÉPUISÉ</span>}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${viewProduct.published !== false ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-gray-100 text-gray-500'}`}>
                      {viewProduct.published !== false ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-text">{Math.round(lowestPrice(viewProduct))} DA</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{viewProduct.category}</span>
                    {viewProduct.brand && <span>· {viewProduct.brand}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <ColorDots product={viewProduct} />
                  </div>
                  {viewProduct.colors && viewProduct.colors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {viewProduct.colors.map((c, i) => (
                        <span key={i} className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full ring-1 ring-gray-200 shrink-0" style={{ backgroundColor: c.name }} />
                          {c.stock ?? 0}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {viewProduct.description && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <p className="text-sm text-gray-600 whitespace-pre-wrap p-4">{viewProduct.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={confirmDelete !== null} title="Supprimer le produit" message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete?.name}" ? Cette action est irréversible.`} onConfirm={confirmDeleteProduct} onCancel={() => setConfirmDelete(null)} />
      <ConfirmDialog open={bulkDeleteConfirm} title="Supprimer plusieurs produits" message={`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} produit(s) ? Cette action est irréversible.`} onConfirm={confirmBulkDelete} onCancel={() => setBulkDeleteConfirm(false)} />
    </div>
  )
}
