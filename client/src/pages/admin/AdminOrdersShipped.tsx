import { useState, useEffect, useCallback, useMemo } from 'react'
import { HiMagnifyingGlass, HiXMark, HiArrowPath, HiFunnel, HiCheck, HiTruck, HiArrowUturnLeft, HiChevronRight, HiUser, HiMapPin, HiTag, HiShoppingBag, HiRectangleGroup, HiPhone, HiHome, HiChevronDown } from 'react-icons/hi2'
import { fetchShippedOrders, updateOrderStatus, type Order } from '../../api/orders'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import Select from '../../components/Select'
import ShippedReturnDialog from '../../components/ShippedReturnDialog'
import OrderActorInfo from '../../components/OrderActorInfo'
import OrderMobileCard from '../../components/OrderMobileCard'

type SortKey = 'newest' | 'oldest' | 'order_asc' | 'order_desc' | 'total_asc' | 'total_desc'

const sortLabels: Record<SortKey, string> = {
  newest: 'Plus récent',
  oldest: 'Plus ancien',
  order_asc: 'N° croissant',
  order_desc: 'N° décroissant',
  total_desc: 'Total décroissant',
  total_asc: 'Total croissant',
}

export default function AdminOrdersShipped() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [wilayaFilter, setWilayaFilter] = useState('')
  const [deliveryCompanyFilter, setDeliveryCompanyFilter] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [bulkAction, setBulkAction] = useState<'back' | 'deliver' | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'deliver' | 'back'; order: Order } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [returnTarget, setReturnTarget] = useState<Order | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchShippedOrders()
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const uniqueWilayas = useMemo(() => [...new Set(orders.map(o => o.wilaya))].sort(), [orders])
  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, string>()
    orders.forEach(o => {
      if (o.deliveryCompany?._id) map.set(o.deliveryCompany._id, o.deliveryCompany.abbreviation || o.deliveryCompany.name)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [orders])

  const activeFilterCount = useMemo(() => {
    let c = 0
    if (wilayaFilter) c++
    if (deliveryCompanyFilter) c++
    return c
  }, [wilayaFilter, deliveryCompanyFilter])

  const filtered = useMemo(() => {
    let result = orders

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(o =>
        `${o.orderNumber}`.includes(q) ||
        o.firstName.toLowerCase().includes(q) ||
        o.lastName.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        o.wilaya.toLowerCase().includes(q)
      )
    }

    if (wilayaFilter) result = result.filter(o => o.wilaya === wilayaFilter)
    if (deliveryCompanyFilter) result = result.filter(o => o.deliveryCompany?._id === deliveryCompanyFilter)

    switch (sort) {
      case 'newest': result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'oldest': result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break
      case 'order_asc': result = [...result].sort((a, b) => a.orderNumber - b.orderNumber); break
      case 'order_desc': result = [...result].sort((a, b) => b.orderNumber - a.orderNumber); break
      case 'total_desc': result = [...result].sort((a, b) => b.total - a.total); break
      case 'total_asc': result = [...result].sort((a, b) => a.total - b.total); break
    }

    return result
  }, [orders, search, wilayaFilter, deliveryCompanyFilter, sort])

  function clearFilters() {
    setSearch('')
    setWilayaFilter('')
    setDeliveryCompanyFilter('')
    setSort('newest')
  }

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    if (allSelected) setSelectedIds([])
    else setSelectedIds(filtered.map(o => o._id))
  }

  async function handleBackToConfirmed(id: string) {
    if (actionLoading) return
    setActionLoading(true)
    try {
      await updateOrderStatus(id, 'confirmed')
      setOrders(prev => prev.filter(o => o._id !== id))
      setSelectedIds(prev => prev.filter(x => x !== id))
      setViewOrder(null)
    } catch {
      load()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeliver(id: string) {
    if (actionLoading) return
    setActionLoading(true)
    try {
      await updateOrderStatus(id, 'delivered')
      setOrders(prev => prev.filter(o => o._id !== id))
      setSelectedIds(prev => prev.filter(x => x !== id))
      setViewOrder(null)
    } catch {
      load()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleBulkDeliver() {
    if (actionLoading) return
    setActionLoading(true)
    try {
      await Promise.all(selectedIds.map(id => updateOrderStatus(id, 'delivered')))
      setOrders(prev => prev.filter(o => !selectedIds.includes(o._id)))
      setSelectedIds([])
      setBulkAction(null)
    } catch {
      load()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleBulkBackToConfirmed() {
    if (actionLoading) return
    setActionLoading(true)
    try {
      await Promise.all(selectedIds.map(id => updateOrderStatus(id, 'confirmed')))
      setOrders(prev => prev.filter(o => !selectedIds.includes(o._id)))
      setSelectedIds([])
      setBulkAction(null)
    } catch {
      load()
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Expédiées</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{orders.length} expédiée{orders.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={load} className="ml-auto p-2 rounded-full text-white md:text-gray-400 bg-white/10 md:bg-transparent border border-white/15 md:border-transparent backdrop-blur-md md:backdrop-blur-none hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer" title="Actualiser">
            <HiArrowPath size={18} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl px-3 md:px-4 lg:px-5">
        <div className="flex items-center justify-between pt-3 pb-0">
          <div className="flex items-center gap-2">
            <HiFunnel size={13} className="text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Filtres</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-[11px] font-medium text-primary hover:underline cursor-pointer">Effacer</button>
          )}
        </div>
        <div className="pt-3 pb-3">
          <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
            <div className="flex items-center gap-2 w-full md:flex-1 md:min-w-[200px] md:max-w-md">
              <div className="relative flex-1 min-w-0">
                <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher par numéro, nom, téléphone, wilaya..."
                  className="w-full h-10 pl-9 pr-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all"
                />
              </div>
              <div className="w-10 shrink-0 md:hidden">
                <Select value={sort} onChange={v => setSort(v as SortKey)} options={Object.keys(sortLabels) as SortKey[]} placeholder="Trier par" formatOption={k => sortLabels[k as SortKey]} iconOnMobile />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:items-center md:gap-3 md:w-auto">
              <div className="w-full md:w-40 shrink-0">
                <Select value={wilayaFilter} onChange={setWilayaFilter} options={uniqueWilayas} placeholder="Toutes wilayas" />
              </div>
              <div className="w-full md:w-44 shrink-0">
                <Select value={deliveryCompanyFilter} onChange={setDeliveryCompanyFilter} options={uniqueCompanies.map(c => c[0])} placeholder="Tous transporteurs" formatOption={id => uniqueCompanies.find(c => c[0] === id)?.[1] || 'Inconnu'} />
              </div>
              <div className="hidden md:block w-full md:w-48 shrink-0">
                <Select value={sort} onChange={v => setSort(v as SortKey)} options={Object.keys(sortLabels) as SortKey[]} placeholder="Trier par" formatOption={k => sortLabels[k as SortKey]} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="mb-4 flex items-center gap-1.5 flex-wrap px-4 md:px-6 lg:px-8">
          {wilayaFilter && <Chip label={wilayaFilter} onClear={() => setWilayaFilter('')} />}
          {deliveryCompanyFilter && <Chip label={uniqueCompanies.find(c => c[0] === deliveryCompanyFilter)?.[1] || 'Inconnu'} onClear={() => setDeliveryCompanyFilter('')} />}
          <button onClick={clearFilters} className="text-[10px] font-medium text-gray-400 hover:text-primary transition-colors cursor-pointer ml-1">Tout effacer</button>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <div className="mb-3 px-4 md:px-6 lg:px-8">
          <p className="text-xs text-gray-400">{filtered.length} commande{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Orders list */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Aucune commande expédiée</p>
            <p className="text-xs text-gray-400">Pas de commandes en cours d'expédition</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/80">
            <div className="flex items-center px-3 py-2 bg-gray-50/80">
              <button
                onClick={toggleAll}
                className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer shrink-0 rounded-md ${allSelected ? 'bg-primary border-primary' : 'bg-white border-gray-300 hover:border-primary'}`}
              >
                {allSelected && <HiCheck size={10} className="text-white" />}
              </button>
              <span className="ml-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {selectedIds.length > 0 ? `${selectedIds.length} sélectionnée${selectedIds.length !== 1 ? 's' : ''}` : `${filtered.length} commande${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            {filtered.map(order => (
              <ShippedRow
                key={order._id}
                order={order}
                selected={selectedIds.includes(order._id)}
                onToggle={() => toggleSelect(order._id)}
                onClick={() => setViewOrder(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {selectedIds.length > 0 && (
        <>
          <div className="h-16" />
          <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-20 bg-white border-t border-gray-200 px-4 md:px-6 lg:px-8 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            {/* Mobile compact bar */}
            <div className="flex items-center justify-between gap-2 md:hidden">
              <span className="text-sm font-medium text-text min-w-0 truncate">
                {selectedIds.length} commande{selectedIds.length !== 1 ? 's' : ''} sélectionnée{selectedIds.length !== 1 ? 's' : ''}
              </span>
              <button onClick={() => setActionsOpen(true)} className="h-10 px-4 rounded-lg bg-foreground text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-transform active:scale-95">
                Actions <HiChevronDown size={14} />
              </button>
            </div>
            {/* Desktop bar */}
            <div className="hidden md:flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-text">
                {selectedIds.length} commande{selectedIds.length !== 1 ? 's' : ''} sélectionnée{selectedIds.length !== 1 ? 's' : ''}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button onClick={() => setBulkAction('deliver')} className="h-9 px-4 rounded-lg bg-foreground hover:bg-foreground text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                  <HiCheck size={14} /> Livrée
                </button>
                <button onClick={() => setBulkAction('back')} className="h-9 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                    <HiArrowUturnLeft size={14} /> Marquer non expédiée
                </button>
                <button
                  onClick={() => setShowReturnDialog(true)}
                  className="h-9 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <HiArrowUturnLeft size={14} /> Retourner ({selectedIds.length})
                </button>
              </div>
            </div>
          </div>

          {/* Mobile actions sheet */}
          {actionsOpen && (
            <>
              <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setActionsOpen(false)} />
              <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white rounded-t-2xl p-4 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-text">
                    {selectedIds.length} commande{selectedIds.length !== 1 ? 's' : ''} sélectionnée{selectedIds.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => setActionsOpen(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-500 transition-colors cursor-pointer">
                    <HiXMark size={18} />
                  </button>
                </div>
                <div className="grid gap-1.5">
                  <button onClick={() => { setActionsOpen(false); setBulkAction('deliver') }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-foreground text-white transition-transform active:scale-[0.98] cursor-pointer">
                    <HiCheck size={16} className="text-green-400" />
                    <span className="text-sm font-semibold">Marquer comme livrée</span>
                  </button>
                  <button onClick={() => { setActionsOpen(false); setBulkAction('back') }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <HiArrowUturnLeft size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-text">Marquer non expédiée</span>
                  </button>
                  <button onClick={() => { setActionsOpen(false); setShowReturnDialog(true) }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <HiArrowUturnLeft size={16} className="text-orange-400" />
                    <span className="text-sm font-medium text-text">Retourner ({selectedIds.length})</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal open={viewOrder !== null} onClose={() => setViewOrder(null)} title={viewOrder ? `Commande #${viewOrder.orderNumber}` : ''} className="lg:ml-64" maxWidth="max-w-3xl">
        {viewOrder && (
          <div className="space-y-6">
            {/* Client */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiUser size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Client</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-gray-100 sm:divide-y-0">
                <div className="flex items-center gap-3 px-4 py-3 sm:block sm:border-r sm:border-gray-100">
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 sm:hidden">
                    <HiUser size={15} />
                  </span>
                  <span className="min-w-0 flex-1 sm:block">
                    <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1">Nom</span>
                    <span className="block text-sm font-medium text-text truncate sm:whitespace-normal">{viewOrder.firstName} {viewOrder.lastName}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 sm:block">
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 sm:hidden">
                    <HiPhone size={15} />
                  </span>
                  <span className="min-w-0 flex-1 sm:block">
                    <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1">Téléphone</span>
                    <a href={`tel:${viewOrder.phone}`} className="block text-sm font-medium text-primary truncate sm:whitespace-normal">{viewOrder.phone}</a>
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 sm:block sm:border-r sm:border-t sm:border-gray-100">
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 sm:hidden">
                    <HiMapPin size={15} />
                  </span>
                  <span className="min-w-0 flex-1 sm:block">
                    <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1">Wilaya & Commune</span>
                    <span className="block text-sm font-medium text-text truncate sm:whitespace-normal">{viewOrder.wilaya}{viewOrder.commune ? ` - ${viewOrder.commune}` : ''}</span>
                  </span>
                </div>
                <div className="flex items-start gap-3 px-4 py-3 sm:block sm:border-t sm:border-gray-100">
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 sm:hidden">
                    <HiHome size={15} />
                  </span>
                  <span className="min-w-0 flex-1 sm:block">
                    <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1">Adresse</span>
                    <span className="block text-sm font-medium text-text leading-snug">{viewOrder.address || '-'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Statut */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiTag size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Statut</h3>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <HiTruck size={16} />
                  </div>
                  <p className="text-sm font-semibold text-text">Commande expédiée</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <button onClick={() => setConfirmAction({ type: 'deliver', order: viewOrder })} disabled={actionLoading} className="h-10 px-5 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                    <HiCheck size={14} /> Livrée
                  </button>
                  <button onClick={() => setConfirmAction({ type: 'back', order: viewOrder })} disabled={actionLoading} className="h-10 px-5 rounded-lg bg-foreground/5 border border-foreground/15 text-foreground hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                    <HiArrowUturnLeft size={14} /> Marquer non expédiée
                  </button>
                  <button onClick={() => setReturnTarget(viewOrder)} className="h-10 px-5 rounded-lg bg-foreground/5 border border-foreground/15 text-foreground hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                    <HiArrowUturnLeft size={14} /> Retourner
                  </button>
                </div>
                {(viewOrder.confirmedBy?.name || viewOrder.cancelledBy?.name) && (
                  <div className="mt-3">
                    <OrderActorInfo confirmedBy={viewOrder.confirmedBy} cancelledBy={viewOrder.cancelledBy} />
                  </div>
                )}
              </div>
            </div>

            {/* Livraison */}
            {viewOrder.deliveryCompany && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <HiMapPin size={14} className="text-primary" />
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Livraison</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-gray-100 sm:divide-y-0 sm:divide-x">
                  <div className="flex items-center gap-3 px-4 py-3 sm:py-2.5">
                    <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0">
                      <HiTruck size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Transporteur</span>
                      <span className="block text-sm font-medium text-text truncate">{viewOrder.deliveryCompany.abbreviation || viewOrder.deliveryCompany.name}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 sm:py-2.5">
                    <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0">
                      <HiHome size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Type</span>
                      <span className="block text-sm font-medium text-text truncate">{viewOrder.deliveryMethod === 'home' ? 'Livraison à domicile' : 'Stop desk'}</span>
                    </span>
                  </div>
                  {viewOrder.deliveryCost > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 sm:py-2.5">
                      <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0">
                        <HiTag size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Coût</span>
                        <span className="block text-sm font-medium text-text truncate">{Math.round(viewOrder.deliveryCost)} DA</span>
                      </span>
                    </div>
                  )}
                  {viewOrder.deliveryCompany.returnPrice != null && (
                    <div className="flex items-center gap-3 px-4 py-3 sm:py-2.5">
                      <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0">
                        <HiArrowUturnLeft size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Retour</span>
                        <span className="block text-sm font-medium text-text truncate">{viewOrder.deliveryCompany.returnPrice === 0 ? 'Gratuit' : `${viewOrder.deliveryCompany.returnPrice} DA`}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Note */}
            {viewOrder.orderNote && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <HiRectangleGroup size={14} className="text-primary" />
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Note</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <div className="px-4 py-3 sm:col-span-2">
                    <p className="text-sm font-medium text-text whitespace-pre-wrap">{viewOrder.orderNote}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Articles */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiShoppingBag size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Articles ({viewOrder.items.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {viewOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    {item.image && (
                      <div className="relative shrink-0">
                        <img src={item.image} alt={item.name} className="w-12 h-12 sm:w-10 sm:h-10 object-contain ring-1 ring-gray-100 bg-white rounded-2xl" />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-white text-[10px] font-bold flex items-center justify-center sm:hidden">×{item.quantity}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <a href={`/product/${item.product}`} target="_blank" className="block text-sm font-medium text-text line-clamp-2 sm:truncate hover:text-primary transition-colors">{item.name}</a>
                      {!item.color && item.volume && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.volume}</p>
                      )}
                      <p className="text-xs text-gray-400 sm:hidden">{Math.round(item.price)} DA l'unité</p>
                      <p className="text-xs text-gray-400 hidden sm:block">{item.quantity} × {Math.round(item.price)} DA</p>
                    </div>
                    <span className="text-sm font-semibold text-text shrink-0">{Math.round(item.price * item.quantity)} DA</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-500">Sous-total</span>
                  <span className="text-sm font-medium text-text">{Math.round(viewOrder.subtotal)} DA</span>
                </div>
                {viewOrder.deliveryCost > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-500">Livraison</span>
                    <span className="text-sm font-medium text-text">{Math.round(viewOrder.deliveryCost)} DA</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="text-sm font-bold text-text">Total</span>
                  <span className="text-base font-bold text-primary">{Math.round(viewOrder.total)} DA</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {confirmAction && (
        <ConfirmDialog
          open
          title={confirmAction.type === 'deliver' ? 'Marquer comme livrée' : 'Marquer non expédiée'}
          message={confirmAction.type === 'deliver'
            ? `Voulez-vous marquer la commande #${confirmAction.order.orderNumber} comme livrée ?`
            : `La commande #${confirmAction.order.orderNumber} n'a pas encore été expédiée. Voulez-vous la marquer comme non expédiée ?`}
          confirmLabel={confirmAction.type === 'deliver' ? 'Livrer' : 'Remettre'}
          onConfirm={() => {
            if (confirmAction.type === 'deliver') handleDeliver(confirmAction.order._id)
            else handleBackToConfirmed(confirmAction.order._id)
            setConfirmAction(null)
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Bulk deliver confirm */}
      <ConfirmDialog
        open={bulkAction === 'deliver'}
        title="Marquer comme livrée"
        message={`Voulez-vous marquer les ${selectedIds.length} commande${selectedIds.length !== 1 ? 's' : ''} sélectionnée${selectedIds.length !== 1 ? 's' : ''} comme livrées ?`}
        confirmLabel="Livrer"
        onConfirm={handleBulkDeliver}
        onCancel={() => setBulkAction(null)}
      />

      {/* Bulk back to confirmed confirm */}
      <ConfirmDialog
        open={bulkAction === 'back'}
        title="Marquer non expédiée"
        message={`Les commandes sélectionnées n'ont pas encore été expédiées. Voulez-vous les marquer comme non expédiées ?`}
        confirmLabel="Remettre"
        onConfirm={handleBulkBackToConfirmed}
        onCancel={() => setBulkAction(null)}
      />

      <ShippedReturnDialog
        open={showReturnDialog || !!returnTarget}
        orders={returnTarget ? [returnTarget] : orders.filter(o => selectedIds.includes(o._id))}
        onClose={() => { setShowReturnDialog(false); setReturnTarget(null) }}
        onDone={() => {
          if (returnTarget) {
            setOrders(prev => prev.filter(o => o._id !== returnTarget._id))
            setViewOrder(null)
          } else {
            setOrders(prev => prev.filter(o => !selectedIds.includes(o._id)))
            setSelectedIds([])
          }
          setShowReturnDialog(false)
          setReturnTarget(null)
        }}
      />
    </div>
  )
}

function ShippedRow({ order, selected, onToggle, onClick }: { order: Order; selected: boolean; onToggle: () => void; onClick: () => void }) {
  return (
    <div className={`transition-colors cursor-pointer ${selected ? 'bg-primary/5' : 'hover:bg-gray-50/50'}`} onClick={onClick}>
      <OrderMobileCard
        order={order}
        selected={selected}
        onToggle={onToggle}
        badge={<span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold uppercase tracking-wider">Expédiée</span>}
        detailLines={[
          <p className="flex items-center gap-2 text-xs text-gray-500">
            <HiTruck size={13} className="text-gray-300 shrink-0" />
            <span>{order.deliveryCompany?.abbreviation || order.deliveryCompany?.name || 'Sans transporteur'}</span>
            <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
            <span>{order.deliveryMethod === 'home' ? 'Domicile' : 'Stop desk'}</span>
            {order.deliveryCompany?.returnPrice != null && (
              <span className="text-blue-500 ml-auto shrink-0">Retour: {order.deliveryCompany.returnPrice === 0 ? 'Gratuit' : `${order.deliveryCompany.returnPrice} DA`}</span>
            )}
          </p>,
        ]}
      />
      <div className="hidden md:flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button onClick={e => { e.stopPropagation(); onToggle() }} className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer shrink-0 rounded-md ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-300 hover:border-primary'}`}>
            {selected && <HiCheck size={10} className="text-white" />}
          </button>
          <div className="w-10 h-10 bg-gray-100 shrink-0 flex items-center justify-center ring-1 ring-gray-200/50">
            <span className="text-sm font-bold text-primary">#{order.orderNumber}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-text truncate">{order.firstName} {order.lastName}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.phone} · {order.wilaya} · {order.items.length} article{order.items.length !== 1 ? 's' : ''} · {Math.round(order.total)} DA
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {order.deliveryCompany?.abbreviation || order.deliveryCompany?.name || 'Sans transporteur'} · {order.deliveryMethod === 'home' ? 'Domicile' : 'Stop desk'} · {new Date(order.createdAt).toLocaleDateString('fr-FR')}
              {order.deliveryCompany?.returnPrice != null && (
                <span className="ml-2 text-blue-500">Retour: {order.deliveryCompany.returnPrice === 0 ? 'Gratuit' : `${order.deliveryCompany.returnPrice} DA`}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Expédiée</span>
          <HiChevronRight size={16} className="text-gray-300" />
        </div>
      </div>
    </div>
  )
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">
      {label}
      <button onClick={onClear} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button>
    </span>
  )
}
