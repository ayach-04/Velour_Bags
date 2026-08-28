import { useState, useEffect, useMemo } from 'react'
import { HiMagnifyingGlass, HiXMark, HiArrowPath, HiUser, HiMapPin, HiTag, HiShoppingBag, HiRectangleGroup, HiFunnel, HiChevronLeft, HiChevronRight, HiArchiveBox, HiPhone, HiHome, HiTruck } from 'react-icons/hi2'
import { fetchArchivedOrders, type Order } from '../../api/orders'
import { fetchDeliveryCompanies, type DeliveryCompany } from '../../api/delivery'
import { api } from '../../api'
import Modal from '../../components/Modal'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import OrderActorInfo from '../../components/OrderActorInfo'
import OrderMobileCard from '../../components/OrderMobileCard'

const statusLabels: Record<string, string> = {
  delivered: 'Livrée',
  returned: 'Retournée',
  cancelled: 'Annulée',
}

const statusColors: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700',
  returned: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
}

type SortKey = 'newest' | 'oldest' | 'total_desc' | 'total_asc' | 'order_desc' | 'order_asc'

const sortLabels: Record<SortKey, string> = {
  newest: 'Plus récent',
  oldest: 'Plus ancien',
  total_desc: 'Total décroissant',
  total_asc: 'Total croissant',
  order_desc: 'N° décroissant',
  order_asc: 'N° croissant',
}

interface WilayaOption {
  code: string
  name: string
  communes: string[]
}

function fmtDate(d?: string) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '-'
}

export default function AdminOrderArchive() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [wilayaFilter, setWilayaFilter] = useState('')
  const [deliveryCompanyFilter, setDeliveryCompanyFilter] = useState('')
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [years, setYears] = useState<number[]>([])
  const [wilayas, setWilayas] = useState<WilayaOption[]>([])
  const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([])

  useEffect(() => {
    api<WilayaOption[]>('/api/wilayas').then(setWilayas).catch(() => {})
    fetchDeliveryCompanies().then(setDeliveryCompanies).catch(() => {})
  }, [])

  const uniqueWilayas = useMemo(() => {
    const fromList = wilayas.map(w => `${w.code} - ${w.name}`)
    const fromOrders = [...new Set(orders.map(o => o.wilaya))]
    return [...new Set([...fromList, ...fromOrders])].sort((a, b) => a.localeCompare(b))
  }, [wilayas, orders])

  const uniqueCompanies = useMemo(() => {
    const map = new Map(deliveryCompanies.map(c => [c._id, c]))
    return { map }
  }, [deliveryCompanies])

  useEffect(() => {
    load()
  }, [page, dateFrom, dateTo, statusFilter, yearFilter, wilayaFilter, deliveryCompanyFilter, deliveryMethodFilter, sort])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 300)
    return () => clearTimeout(t)
  }, [search])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchArchivedOrders({
        page,
        limit: 50,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        search: search || undefined,
        status: statusFilter || undefined,
        wilaya: wilayaFilter || undefined,
        deliveryCompany: deliveryCompanyFilter || undefined,
        deliveryMethod: deliveryMethodFilter || undefined,
        year: yearFilter || undefined,
        sort: sort || undefined,
      })
      setOrders(data.orders)
      setTotalPages(data.pages)
      setTotal(data.total)
      if (data.years?.length) setYears(data.years)
    } catch {} finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setStatusFilter('')
    setYearFilter('')
    setWilayaFilter('')
    setDeliveryCompanyFilter('')
    setDeliveryMethodFilter('')
    setSort('newest')
    setPage(1)
  }

  function applyQuickDate(days: number) {
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - days)
    setDateFrom(from.toISOString().split('T')[0])
    setDateTo(now.toISOString().split('T')[0])
    setPage(1)
  }

  const quickDates = [
    { label: 'Aujourd\'hui', days: 0 },
    { label: '3 jours', days: 3 },
    { label: '7 jours', days: 7 },
    { label: '30 jours', days: 30 },
  ]

  const activeFilterCount = [search, dateFrom, dateTo, statusFilter, yearFilter, wilayaFilter, deliveryCompanyFilter, deliveryMethodFilter, sort !== 'newest'].filter(Boolean).length

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Archives</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{total} commande{total !== 1 ? 's' : ''}</p>
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
        <div className="pt-3 pb-3 space-y-2.5">
          {/* Row 1: Search + Sort */}
          <div className="flex items-center gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
            <div className="relative flex-1 min-w-0 md:flex-1 md:min-w-[260px] md:max-w-md">
              <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par numéro, nom, téléphone, wilaya..." className="w-full h-10 pl-9 pr-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all" />
            </div>
            <div className="w-10 shrink-0 md:w-48">
              <Select value={sort} onChange={v => { setSort(v as SortKey); setPage(1) }} options={Object.keys(sortLabels) as SortKey[]} placeholder="Trier par" formatOption={k => sortLabels[k as SortKey]} iconOnMobile />
            </div>
          </div>
          {/* Row 2: Quick dates + Date range */}
          <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {quickDates.map(qd => (
                <button key={qd.days} onClick={() => applyQuickDate(qd.days)} className="h-10 px-2.5 sm:px-3 rounded-lg text-[11px] font-medium bg-gray-50 border border-gray-200 text-gray-500 hover:border-primary hover:text-primary transition-all cursor-pointer">
                  {qd.label}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-gray-200 shrink-0 hidden md:block" />
            <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:items-center md:gap-3 md:w-auto">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Du</span>
                <div className="flex-1 md:w-36"><DatePicker value={dateFrom} onChange={v => { setDateFrom(v); setPage(1) }} placeholder="Date début" maxDate={new Date().toISOString().split('T')[0]} rangeStart={dateFrom} rangeEnd={dateTo} /></div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Au</span>
                <div className="flex-1 md:w-36"><DatePicker value={dateTo} onChange={v => { setDateTo(v); setPage(1) }} placeholder="Date fin" maxDate={new Date().toISOString().split('T')[0]} rangeStart={dateFrom} rangeEnd={dateTo} /></div>
              </div>
            </div>
            <div className="w-full md:w-32 shrink-0">
              <Select value={yearFilter} onChange={v => { setYearFilter(v); setPage(1) }} options={years.map(String)} placeholder="Toutes années" />
            </div>
          </div>
          {/* Row 3: All dropdowns */}
          <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:items-center md:gap-3 md:w-auto">
            <div className="w-full md:w-40">
              <Select value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} options={['delivered', 'returned', 'cancelled']} placeholder="Tous statuts" formatOption={s => statusLabels[s] || s} />
            </div>
            <div className="w-full md:w-40">
              <Select value={wilayaFilter} onChange={v => { setWilayaFilter(v); setPage(1) }} options={uniqueWilayas} placeholder="Toutes wilayas" />
            </div>
            <div className="w-full md:w-40">
              <Select value={deliveryMethodFilter} onChange={v => { setDeliveryMethodFilter(v); setPage(1) }} options={['home', 'stopdesk']} placeholder="Toutes livraisons" formatOption={m => m === 'home' ? 'À domicile' : 'Stop desk'} />
            </div>
            <div className="w-full md:w-40">
              <Select value={deliveryCompanyFilter} onChange={v => { setDeliveryCompanyFilter(v); setPage(1) }} options={deliveryCompanies.map(c => c._id)} placeholder="Tous transporteurs" formatOption={id => { const c = uniqueCompanies.map.get(id); return c?.abbreviation || c?.name || id }} />
            </div>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="mb-4 flex items-center gap-1.5 flex-wrap px-4 md:px-6 lg:px-8">
          {search && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">"{search}" <button onClick={() => setSearch('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {dateFrom && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">Du {dateFrom} <button onClick={() => setDateFrom('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {dateTo && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">Au {dateTo} <button onClick={() => setDateTo('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {statusFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">{statusLabels[statusFilter] || statusFilter} <button onClick={() => setStatusFilter('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {yearFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">Année {yearFilter} <button onClick={() => setYearFilter('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {wilayaFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">{wilayaFilter} <button onClick={() => setWilayaFilter('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {deliveryCompanyFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">{uniqueCompanies.map.get(deliveryCompanyFilter)?.name || deliveryCompanyFilter} <button onClick={() => setDeliveryCompanyFilter('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {deliveryMethodFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">{deliveryMethodFilter === 'home' ? 'À domicile' : 'Stop desk'} <button onClick={() => setDeliveryMethodFilter('')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          {sort !== 'newest' && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">{sortLabels[sort]} <button onClick={() => setSort('newest')} className="hover:text-red-500 transition-colors cursor-pointer"><HiXMark size={10} /></button></span>}
          <button onClick={clearFilters} className="text-[10px] font-medium text-gray-400 hover:text-primary transition-colors cursor-pointer ml-1">Tout effacer</button>
        </div>
      )}

      {!loading && (
        <div className="mb-3">
          <p className="text-xs text-gray-400">{orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Aucune commande archivée</p>
            <p className="text-xs text-gray-400">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/80">
            {orders.map(order => (
              <div key={order._id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setViewOrder(order)}>
                <OrderMobileCard
                  order={order}
                  badge={
                    <>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabels[order.status] || order.status}</span>
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        <HiArchiveBox size={10} /> Archivée
                      </span>
                    </>
                  }
                  detailLines={[
                    <p className="flex items-center gap-2 text-xs text-gray-500">
                      <HiArchiveBox size={13} className="text-gray-300 shrink-0" />
                      <span>Archivée le {order.archivedAt ? fmtDate(order.archivedAt) : fmtDate(order.createdAt)}</span>
                    </p>,
                  ]}
                />
                <div className="hidden md:flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-gray-100 shrink-0 flex items-center justify-center ring-1 ring-gray-200/50">
                      <span className="text-sm font-bold text-primary">#{order.orderNumber}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-text truncate">{order.firstName} {order.lastName}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabels[order.status] || order.status}</span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          <HiArchiveBox size={10} /> Archivée
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {order.phone} · {order.wilaya} · {order.items.length} article{order.items.length !== 1 ? 's' : ''} · {Math.round(order.total)} DA
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-300 shrink-0 ml-4 hidden sm:inline">{order.archivedAt ? fmtDate(order.archivedAt) : fmtDate(order.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <p className="text-xs text-gray-400">Page {page} sur {totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 rounded-md flex items-center justify-center border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
              <HiChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              if (p > totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)} className={`h-8 w-8 rounded-md flex items-center justify-center text-xs font-medium transition-all cursor-pointer ${p === page ? 'bg-primary text-white' : 'border border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8 rounded-md flex items-center justify-center border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
              <HiChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <Modal open={viewOrder !== null} onClose={() => setViewOrder(null)} title={viewOrder ? `Commande #${viewOrder.orderNumber}` : ''} className="lg:ml-64" maxWidth="max-w-3xl">
        {viewOrder && (
          <div className="space-y-5">
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

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiTag size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Statut</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <span className={`text-[11px] font-medium px-3 py-1.5 rounded-full text-center ${statusColors[viewOrder.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabels[viewOrder.status] || viewOrder.status}</span>
                  <span className="inline-flex items-center justify-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-500">
                    <HiArchiveBox size={12} /> Archivée le {fmtDate(viewOrder.archivedAt)}
                  </span>
                </div>
                {viewOrder.deliveredAt && <p className="text-xs text-gray-400">Livrée le {fmtDate(viewOrder.deliveredAt)}</p>}
                {viewOrder.returnedAt && <p className="text-xs text-gray-400">Retournée le {fmtDate(viewOrder.returnedAt)}</p>}
                {(viewOrder.confirmedBy?.name || viewOrder.cancelledBy?.name) && (
                  <div className="pt-2">
                    <OrderActorInfo confirmedBy={viewOrder.confirmedBy} cancelledBy={viewOrder.cancelledBy} />
                  </div>
                )}
              </div>
            </div>

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
                      <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Méthode</span>
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
                </div>
              </div>
            )}

            {viewOrder.orderNote && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <HiRectangleGroup size={14} className="text-primary" />
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Note</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-text whitespace-pre-wrap">{viewOrder.orderNote}</p>
                </div>
              </div>
            )}

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
    </div>
  )
}
