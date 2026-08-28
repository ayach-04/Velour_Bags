import { useState, useEffect, useMemo } from 'react'
import { HiMagnifyingGlass, HiArrowPath, HiExclamationTriangle, HiPlus, HiMinus, HiCheck, HiFunnel, HiXMark, HiChevronDown, HiSwatch } from 'react-icons/hi2'
import { fetchProducts, updateProduct, type Product } from '../../api/products'
import { clearProductCache } from '../../api/catalog'
import Select from '../../components/Select'

function hasColors(product: Product): boolean {
  return !!(product.colors && product.colors.length > 0)
}

function colorStock(product: Product, colorName: string): number {
  return product.colors?.find(c => c.name === colorName)?.stock ?? 0
}

function totalAvailable(product: Product): number {
  if (hasColors(product)) return (product.colors || []).reduce((s, c) => s + (c.stock ?? 0), 0)
  return product.stock ?? 0
}

function stockedColors(product: Product): number {
  return (product.colors || []).filter(c => (c.stock ?? 0) > 0).length
}

function isOut(product: Product): boolean {
  if (hasColors(product)) return (product.colors || []).every(c => (c.stock ?? 0) <= 0)
  return (product.stock ?? 0) <= 0
}

function isLow(product: Product): boolean {
  if (hasColors(product)) return (product.colors || []).some(c => {
    const s = c.stock ?? 0
    return s > 0 && s <= 5
  })
  const s = product.stock ?? 0
  return s > 0 && s <= 5
}

interface QtyStepperProps {
  original: number
  rawValue: string | undefined
  editing: boolean
  compact?: boolean
  onAdjust: (delta: number) => void
  onChange: (value: string) => void
  onCancel: () => void
}

function QtyStepper({ original, rawValue, editing, compact, onAdjust, onChange, onCancel }: QtyStepperProps) {
  const btnCls = compact ? 'w-10 h-10' : 'w-8 h-8'
  const inputCls = compact ? 'flex-1 h-10' : 'w-14 h-8'
  return (
    <div className={`flex items-center ${compact ? 'w-full justify-center' : 'gap-1.5'}`}>
      <div className={`flex items-center ${compact ? 'w-full max-w-40 rounded-xl' : 'rounded-lg'} ${editing ? 'bg-primary/5 border border-primary/30' : 'bg-gray-50 border border-gray-200'}`}>
        <button onClick={() => onAdjust(-1)} className={`${btnCls} shrink-0 flex items-center justify-center transition-all cursor-pointer rounded-md ${editing ? 'text-primary hover:bg-primary/10' : 'text-gray-400 hover:text-text hover:bg-gray-100'}`}>
          <HiMinus size={12} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={rawValue ?? String(original)}
          onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          onWheel={e => e.currentTarget.blur()}
          onMouseDown={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          onKeyUp={e => e.stopPropagation()}
          className={`${inputCls} min-w-0 text-center text-sm font-medium bg-transparent focus:outline-none tabular-nums ${editing ? 'text-primary' : 'text-text'}`}
        />
        <button onClick={() => onAdjust(1)} className={`${btnCls} shrink-0 flex items-center justify-center transition-all cursor-pointer rounded-md ${editing ? 'text-primary hover:bg-primary/10' : 'text-gray-400 hover:text-text hover:bg-gray-100'}`}>
          <HiPlus size={12} />
        </button>
      </div>
      {editing && !compact && (
        <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer rounded-md" title="Annuler">
          <HiXMark size={14} />
        </button>
      )}
    </div>
  )
}

interface ColorEditorProps {
  product: Product
  colorName: string
  restockInputs: Record<string, string>
  editedKeys: string[]
  compact?: boolean
  onAdjust: (product: Product, delta: number, colorName: string) => void
  onChange: (key: string, value: string) => void
  onCancel: (key: string) => void
}

function ColorEditor({ product, colorName, restockInputs, editedKeys, compact, onAdjust, onChange, onCancel }: ColorEditorProps) {
  const key = `${product._id}::${colorName}`
  const color = product.colors?.find(c => c.name === colorName)
  const stock = colorStock(product, colorName)
  const editing = editedKeys.includes(key)
  const out = stock <= 0
  const low = stock > 0 && stock <= 5

  const statusCls = out ? 'text-red-500' : low ? 'text-yellow-600' : 'text-gray-400'
  const statusText = out ? 'Rupture' : low ? 'Stock bas' : 'En stock'

  if (compact) {
    return (
      <div className={`bg-white border px-2.5 py-2 rounded-xl ${editing ? 'border-primary/40 ring-1 ring-primary/10' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2 min-w-0 mb-1.5">
          {color && (color.image ? (
            <img src={color.image} alt={colorName} className="w-6 h-6 rounded-full object-cover shrink-0" />
          ) : (
            <span className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: color.name }} />
          ))}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text truncate leading-tight">{colorName}</p>
            <p className={`text-[10px] font-medium ${statusCls}`}>{statusText}</p>
          </div>
        </div>
        <QtyStepper
          original={stock}
          rawValue={restockInputs[key]}
          editing={editing}
          compact
          onAdjust={d => onAdjust(product, d, colorName)}
          onChange={v => onChange(key, v)}
          onCancel={() => onCancel(key)}
        />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2.5 bg-white border px-3 py-2.5 rounded-xl ${editing ? 'border-primary/30 ring-1 ring-primary/10' : 'border-gray-100'}`}>
      {color && (color.image ? (
        <img src={color.image} alt={colorName} className="w-8 h-8 rounded-full object-cover shrink-0" />
      ) : (
        <span className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: color.name }} />
      ))}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text truncate">{colorName}</p>
        <p className={`text-[10px] font-medium ${statusCls}`}>{statusText}</p>
      </div>
      <QtyStepper
        original={stock}
        rawValue={restockInputs[key]}
        editing={editing}
        onAdjust={d => onAdjust(product, d, colorName)}
        onChange={v => onChange(key, v)}
        onCancel={() => onCancel(key)}
      />
    </div>
  )
}

function DistributionBar({ product }: { product: Product }) {
  const colors = product.colors || []
  const total = totalAvailable(product)
  return (
    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden flex shrink-0">
      {colors.map(c => {
        const pct = total > 0 ? ((c.stock ?? 0) / total) * 100 : 0
        const out = (c.stock ?? 0) <= 0
        return (
          <span
            key={c.name}
            className="h-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: out ? '#e5e7eb' : c.name }}
          />
        )
      })}
    </div>
  )
}

function ProductStatus({ product }: { product: Product }) {
  const out = isOut(product)
  const low = isLow(product)
  return (
    <>
      {out && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full shrink-0">RUPTURE</span>}
      {!out && low && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full shrink-0">BAS</span>}
    </>
  )
}

interface ColorPanelProps {
  product: Product
  compact?: boolean
  className?: string
  restockInputs: Record<string, string>
  editedKeys: string[]
  onAdjust: (product: Product, delta: number, colorName: string) => void
  onChange: (key: string, value: string) => void
  onCancel: (key: string) => void
}

function ColorPanel({ product, compact, className, restockInputs, editedKeys, onAdjust, onChange, onCancel }: ColorPanelProps) {
  const cols = compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
  return (
    <div className={`grid gap-2 ${cols} ${className || ''}`}>
      {(product.colors || []).map(c => (
        <ColorEditor
          key={c.name}
          product={product}
          colorName={c.name}
          compact={compact}
          restockInputs={restockInputs}
          editedKeys={editedKeys}
          onAdjust={onAdjust}
          onChange={onChange}
          onCancel={onCancel}
        />
      ))}
    </div>
  )
}

export default function AdminStock() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tab, setTab] = useState<'all' | 'out' | 'low'>('all')
  const [restockInputs, setRestockInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

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

  const outOfStock = useMemo(() => products.filter(isOut), [products])
  const lowStock = useMemo(() => products.filter(isLow), [products])

  const brands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(), [products])
  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products])

  const activeList = tab === 'all' ? products : tab === 'out' ? outOfStock : lowStock

  const filtered = useMemo(() => {
    let result = activeList
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q))
    }
    if (brandFilter) result = result.filter(p => p.brand === brandFilter)
    if (categoryFilter) result = result.filter(p => p.category === categoryFilter)
    return result
  }, [activeList, search, brandFilter, categoryFilter])

  const editedKeys = useMemo(() => {
    return Object.entries(restockInputs).filter(([key, val]) => {
      const [pid, colorName] = key.split('::')
      const product = products.find(p => p._id === pid)
      if (!product) return false
      const newQty = parseInt(val, 10)
      const original = colorName ? colorStock(product, colorName) : (product.stock ?? 0)
      return !isNaN(newQty) && newQty !== original
    }).map(([key]) => key)
  }, [restockInputs, products])

  const editedProducts = useMemo(() => [...new Set(editedKeys.map(k => k.split('::')[0]))], [editedKeys])

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSaveAll() {
    if (editedKeys.length === 0) return
    setSaving(true)
    try {
      const byProduct: Record<string, Record<string, number>> = {}
      editedKeys.forEach(key => {
        const [pid, colorName] = key.split('::')
        const qty = parseInt(restockInputs[key] || '0', 10)
        if (!byProduct[pid]) byProduct[pid] = {}
        byProduct[pid][colorName || '__stock'] = qty
      })
      await Promise.all(Object.entries(byProduct).map(async ([pid, changes]) => {
        const product = products.find(p => p._id === pid)
        if (!product) return
        if (hasColors(product)) {
          const colors = (product.colors || []).map(c => {
            const q = changes[c.name]
            return q !== undefined ? { ...c, stock: q } : c
          })
          const allOut = colors.every(c => (c.stock ?? 0) <= 0)
          await updateProduct(pid, { colors, label: allOut ? 'OUT_OF_STOCK' : undefined })
        } else {
          const q = changes.__stock
          await updateProduct(pid, { stock: q, label: q > 0 ? undefined : 'OUT_OF_STOCK' })
        }
      }))
      setProducts(prev => prev.map(p => {
        const changes = byProduct[p._id]
        if (!changes) return p
        if (hasColors(p)) {
          const colors = (p.colors || []).map(c => {
            const q = changes[c.name]
            return q !== undefined ? { ...c, stock: q } : c
          })
          const allOut = colors.every(c => (c.stock ?? 0) <= 0)
          return { ...p, colors, label: allOut ? 'OUT_OF_STOCK' : undefined }
        }
        const q = changes.__stock
        return { ...p, stock: q, label: q > 0 ? undefined : 'OUT_OF_STOCK' }
      }))
      setRestockInputs({})
      clearProductCache()
    } catch {} finally {
      setSaving(false)
    }
  }

  function adjustStock(product: Product, delta: number, colorName?: string) {
    const key = colorName ? `${product._id}::${colorName}` : product._id
    const original = colorName ? colorStock(product, colorName) : (product.stock ?? 0)
    const current = parseInt(restockInputs[key] ?? String(original), 10)
    const newQty = Math.max(0, (isNaN(current) ? 0 : current) + delta)
    setRestockInputs(prev => ({ ...prev, [key]: String(newQty) }))
  }

  const hasFilters = search || brandFilter || categoryFilter
  const stepperIO = {
    onAdjust: adjustStock,
    onChange: (key: string, value: string) => setRestockInputs(prev => ({ ...prev, [key]: value })),
    onCancel: (key: string) => setRestockInputs(prev => { const n = { ...prev }; delete n[key]; return n }),
  }

  // Reusable editor block for the master list
  const expandBlock = (product: Product, compact: boolean) => {
    const isOpen = !!expanded[product._id]
    return (
      <>
        <button
          onClick={e => { e.stopPropagation(); toggleExpand(product._id) }}
          className={`flex items-center justify-center gap-1 w-full py-2 text-[11px] font-medium transition-all cursor-pointer rounded-xl border ${isOpen ? 'border-primary/30 text-primary bg-primary/5' : 'border-gray-100 text-gray-400 hover:text-primary hover:border-primary/30'}`}
        >
          <HiSwatch size={13} />
          {isOpen ? 'Cacher le détail' : 'Gérer le stock par couleur'}
          <HiChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className={`mt-2 ${compact ? '' : 'px-4 sm:px-6 py-4 bg-gray-50/50 border-y border-gray-100'}`}>
            <ColorPanel
              product={product}
              compact={compact}
              restockInputs={restockInputs}
              editedKeys={editedKeys}
              onAdjust={adjustStock}
              onChange={stepperIO.onChange}
              onCancel={stepperIO.onCancel}
            />
          </div>
        )}
      </>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-between h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Gestion des stocks</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{outOfStock.length} en rupture · {lowStock.length} stock bas</p>
          </div>
          <button onClick={load} className="p-2 rounded-full text-white md:text-gray-400 bg-white/10 md:bg-transparent border border-white/15 md:border-transparent backdrop-blur-md md:backdrop-blur-none hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer" title="Actualiser">
            <HiArrowPath size={18} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-4 rounded-2xl">
          <div className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg bg-red-50 text-red-500"><HiExclamationTriangle size={20} /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Rupture</p>
            <p className="text-xl font-bold text-text mt-0.5">{outOfStock.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-4 rounded-2xl">
          <div className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg bg-yellow-50 text-yellow-600"><HiExclamationTriangle size={20} /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Stock bas</p>
            <p className="text-xl font-bold text-text mt-0.5">{lowStock.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-4 rounded-2xl">
          <div className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary"><HiExclamationTriangle size={20} /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total concernés</p>
            <p className="text-xl font-bold text-text mt-0.5">{outOfStock.length + lowStock.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-4 rounded-2xl">
          <div className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg bg-green-50 text-green-600"><HiCheck size={20} /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">En stock</p>
            <p className="text-xl font-bold text-text mt-0.5">{products.length - outOfStock.length - lowStock.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="hidden md:flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setTab('all')} className={`px-4 py-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap rounded-lg ${tab === 'all' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:text-text hover:bg-gray-50'}`}>
          Tous les produits
          <span className="ml-1.5 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{products.length}</span>
        </button>
        <button onClick={() => setTab('out')} className={`px-4 py-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap rounded-lg ${tab === 'out' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-gray-500 hover:text-text hover:bg-gray-50'}`}>
          Rupture de stock
          <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{outOfStock.length}</span>
        </button>
        <button onClick={() => setTab('low')} className={`px-4 py-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap rounded-lg ${tab === 'low' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'text-gray-500 hover:text-text hover:bg-gray-50'}`}>
          Stock bas (≤5)
          <span className="ml-1.5 text-[10px] font-bold bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full">{lowStock.length}</span>
        </button>
      </div>

      {/* Search + Filters */}
      <div className="hidden md:flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou marque..." className="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder:text-gray-400 focus:outline-none focus:border-primary/40 transition-colors rounded-lg" />
        </div>
        <div className="w-full sm:w-40">
          <Select value={brandFilter} onChange={setBrandFilter} options={['', ...brands]} placeholder="Toutes marques" formatOption={v => v || 'Toutes marques'} />
        </div>
        <div className="w-full sm:w-44">
          <Select value={categoryFilter} onChange={setCategoryFilter} options={['', ...categories]} placeholder="Toutes catégories" formatOption={v => v || 'Toutes catégories'} />
        </div>
      </div>

      {/* Active chips */}
      {hasFilters && (
        <div className="hidden md:flex items-center gap-2 flex-wrap mb-4">
          {search && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">"{search}" <button onClick={() => setSearch('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {brandFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">{brandFilter} <button onClick={() => setBrandFilter('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {categoryFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">{categoryFilter} <button onClick={() => setCategoryFilter('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          <button onClick={() => { setSearch(''); setBrandFilter(''); setCategoryFilter('') }} className="text-[10px] font-medium text-gray-400 hover:text-primary transition-colors cursor-pointer ml-1">Tout effacer</button>
        </div>
      )}

      {/* Desktop master list */}
      <div className={`hidden md:block bg-white border border-gray-100 shadow-sm overflow-hidden rounded-2xl transition-all ${editedProducts.length > 0 ? 'mb-16' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3"><HiCheck size={20} className="text-green-500" /></div>
            <p className="text-sm font-medium text-gray-500 mb-1">{tab === 'all' ? 'Aucun produit' : tab === 'out' ? 'Aucun produit en rupture' : 'Aucun produit en stock bas'}</p>
            <p className="text-xs text-gray-400">Tous les stocks sont OK</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/80">
            {/* Info row */}
            <div className="flex items-center px-4 py-2.5 bg-gray-50/60">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {filtered.length} produit{filtered.length !== 1 ? 's' : ''} · cliquer sur une ligne pour gérer le stock
              </span>
            </div>

            {/* Product rows */}
            {filtered.map(product => {
              const isOpen = !!expanded[product._id]
              const hasCol = hasColors(product)
              const stocked = stockedColors(product)
              const total = totalAvailable(product)
              const colCount = (product.colors || []).length

              return (
                <div key={product._id} className="group">
                  {/* Master row */}
                  <div
                    onClick={() => hasCol && toggleExpand(product._id)}
                    className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${isOpen ? 'bg-primary/[0.03]' : 'group-hover:bg-gray-50/80'} ${hasCol ? 'cursor-pointer' : ''}`}
                  >
                    <div className="w-11 h-11 bg-gray-100 shrink-0 overflow-hidden rounded-lg">
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-text truncate">{product.name}</span>
                        <ProductStatus product={product} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span className="truncate">{product.brand || '—'} · {product.category}</span>
                        <span className="text-gray-200">·</span>
                        <span className="tabular-nums">
                          {product.volumes && product.volumes.length > 1
                            ? `Dès ${Math.round(Math.min(...product.volumes.map(v => v.price)))} DA`
                            : `${Math.round(product.price)} DA`}
                        </span>
                      </div>
                    </div>

                    {hasCol ? (
                      <>
                        <div className="hidden xl:flex items-center gap-3 shrink-0">
                          <DistributionBar product={product} />
                          <div className="text-right">
                            <p className="text-sm font-semibold text-text tabular-nums leading-tight">{total} pièces</p>
                            <p className="text-[11px] text-gray-400 tabular-nums">{stocked}/{colCount} couleurs</p>
                          </div>
                        </div>
                        <div className="flex xl:hidden items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-text tabular-nums leading-tight">{total}</p>
                            <p className="text-[11px] text-gray-400 tabular-nums">{stocked}/{colCount}</p>
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); toggleExpand(product._id) }}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer shrink-0 ${isOpen ? 'bg-primary/10 text-primary' : 'text-gray-400 group-hover:bg-white group-hover:text-primary'}`}
                        >
                          <HiChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </>
                    ) : (
                      <div className="shrink-0">
                        <QtyStepper
                          original={product.stock ?? 0}
                          rawValue={restockInputs[product._id]}
                          editing={editedKeys.includes(product._id)}
                          onAdjust={d => adjustStock(product, d)}
                          onChange={v => stepperIO.onChange(product._id, v)}
                          onCancel={() => stepperIO.onCancel(product._id)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Detail panel */}
                  {hasCol && isOpen && (
                    <div className="px-4 sm:px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <HiSwatch size={14} className="text-primary" />
                        <span className="text-xs font-semibold text-text uppercase tracking-wider">Stock par couleur</span>
                        <span className="text-[11px] text-gray-400 ml-auto tabular-nums">{total} pièces au total</span>
                      </div>
                      <ColorPanel
                        product={product}
                        restockInputs={restockInputs}
                        editedKeys={editedKeys}
                        onAdjust={adjustStock}
                        onChange={stepperIO.onChange}
                        onCancel={stepperIO.onCancel}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Mobile: stats strip */}
      <div className="md:hidden grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm px-3 py-2 rounded-2xl shrink-0">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 shrink-0"><HiExclamationTriangle size={14} /></div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Rupture</p>
            <p className="text-sm font-bold text-text leading-tight tabular-nums">{outOfStock.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm px-3 py-2 rounded-2xl shrink-0">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-yellow-50 text-yellow-600 shrink-0"><HiExclamationTriangle size={14} /></div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Stock bas</p>
            <p className="text-sm font-bold text-text leading-tight tabular-nums">{lowStock.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm px-3 py-2 rounded-2xl shrink-0">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"><HiExclamationTriangle size={14} /></div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Concernés</p>
            <p className="text-sm font-bold text-text leading-tight tabular-nums">{outOfStock.length + lowStock.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm px-3 py-2 rounded-2xl shrink-0">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 text-green-600 shrink-0"><HiCheck size={14} /></div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">En stock</p>
            <p className="text-sm font-bold text-text leading-tight tabular-nums">{products.length - outOfStock.length - lowStock.length}</p>
          </div>
        </div>
      </div>

      {/* Mobile: sticky toolbar */}
      <div className="md:hidden sticky top-20 z-20 -mx-2 px-2 pt-2 pb-3 bg-white/95 backdrop-blur-xl border-b border-gray-200/60 shadow-sm mb-4">
        <div className="relative">
          <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou marque..."
            className="w-full h-10 pl-9 pr-9 bg-gray-50 border border-gray-200 text-sm text-text placeholder:text-gray-400 focus:outline-none focus:border-primary/40 transition-colors rounded-lg"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={16} /></button>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 mt-2 rounded-2xl">
          <button onClick={() => setTab('all')} className={`flex-1 px-3 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap rounded-lg ${tab === 'all' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>
            Tous<span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === 'all' ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>{products.length}</span>
          </button>
          <button onClick={() => setTab('out')} className={`flex-1 px-3 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap rounded-lg ${tab === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>
            Rupture<span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === 'out' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>{outOfStock.length}</span>
          </button>
          <button onClick={() => setTab('low')} className={`flex-1 px-3 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap rounded-lg ${tab === 'low' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500'}`}>
            Stock bas<span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === 'low' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-500'}`}>{lowStock.length}</span>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider"><HiFunnel size={13} className="text-gray-400" /> Filtres</span>
          {hasFilters && <button onClick={() => { setSearch(''); setBrandFilter(''); setCategoryFilter('') }} className="text-xs font-medium text-gray-400 hover:text-primary transition-colors cursor-pointer">Tout effacer</button>}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <div className="w-full"><Select value={brandFilter} onChange={setBrandFilter} options={['', ...brands]} placeholder="Toutes marques" formatOption={v => v || 'Toutes marques'} /></div>
          <div className="w-full"><Select value={categoryFilter} onChange={setCategoryFilter} options={['', ...categories]} placeholder="Toutes catégories" formatOption={v => v || 'Toutes catégories'} /></div>
        </div>
      </div>

      {/* Mobile: product cards */}
      <div className="md:hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3"><HiCheck size={20} className="text-green-500" /></div>
            <p className="text-sm font-medium text-gray-500 mb-1">{tab === 'all' ? 'Aucun produit' : tab === 'out' ? 'Aucun produit en rupture' : 'Aucun produit en stock bas'}</p>
            <p className="text-xs text-gray-400">Tous les stocks sont OK</p>
          </div>
        ) : (
          <div className={`grid grid-cols-2 items-start gap-3 ${editedProducts.length > 0 ? 'pb-16' : ''}`}>
            {filtered.map(product => {
              const isOpen = !!expanded[product._id]
              const hasCol = hasColors(product)
              const out = isOut(product)
              const low = isLow(product)
              const total = totalAvailable(product)
              const stocked = stockedColors(product)
              const colCount = (product.colors || []).length

              return (
                <div key={product._id} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden flex flex-col transition-all">
                  <div className="relative">
                    <img src={product.image} alt="" className="w-full aspect-square object-cover bg-gray-100" />
                    {out && <span className="absolute top-2 right-2 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">RUPTURE</span>}
                    {!out && low && <span className="absolute top-2 right-2 text-[9px] font-bold bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">BAS</span>}
                  </div>
                  <div className="p-2.5 flex flex-col flex-1">
                    <p className="text-[13px] font-medium text-text leading-snug line-clamp-2 min-h-[2.25rem]">{product.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{product.brand || '—'} · {product.category}</p>
                    <div className="flex items-center justify-between gap-1 mt-1.5 mb-2.5">
                      <span className="text-[11px] text-gray-500 tabular-nums truncate">
                        {product.volumes && product.volumes.length > 1
                          ? `Dès ${Math.round(Math.min(...product.volumes.map(v => v.price)))} DA`
                          : `${Math.round(product.price)} DA`}
                      </span>
                      <span className={`text-[11px] font-semibold shrink-0 ${out ? 'text-red-500' : low ? 'text-yellow-600' : 'text-green-600'}`}>
                        {out ? 'Rupture' : low ? 'Stock bas' : hasCol ? `${total} pièces` : `${total} en stock`}
                      </span>
                    </div>

                    {hasCol ? (
                      <div className="mt-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <DistributionBar product={product} />
                          <span className="text-[10px] text-gray-400 tabular-nums">{stocked}/{colCount} couleurs</span>
                        </div>
                        {expandBlock(product, true)}
                      </div>
                    ) : (
                      <div className="mt-auto flex items-center justify-center pt-1">
                        <QtyStepper
                          original={product.stock ?? 0}
                          rawValue={restockInputs[product._id]}
                          editing={editedKeys.includes(product._id)}
                          compact
                          onAdjust={d => adjustStock(product, d)}
                          onChange={v => stepperIO.onChange(product._id, v)}
                          onCancel={() => stepperIO.onCancel(product._id)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom save bar */}
      {editedProducts.length > 0 && (
        <>
          <div className="h-20" />
          <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-20 bg-white border-t border-gray-200 px-4 md:px-6 lg:px-8 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2 max-w-4xl mx-auto">
              <span className="text-sm font-medium text-text">
                {editedProducts.length} produit{editedProducts.length !== 1 ? 's' : ''} modifié{editedProducts.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRestockInputs({})}
                  className="flex-1 sm:flex-none h-11 sm:h-10 px-5 text-sm font-medium text-gray-500 hover:text-text hover:bg-gray-100 transition-all cursor-pointer rounded-2xl"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="flex-1 sm:flex-none h-11 sm:h-10 px-6 bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 rounded-2xl"
                >
                  {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <HiCheck size={14} />}
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}