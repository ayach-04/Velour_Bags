import { useState, useEffect, useCallback, useMemo } from 'react'
import { HiMagnifyingGlass, HiXMark, HiTruck, HiArrowPath, HiUser, HiMapPin, HiTag, HiShoppingBag, HiRectangleGroup, HiFunnel, HiCheck, HiDocumentArrowUp, HiDocumentText, HiChevronRight, HiPencil, HiMinus, HiPlus, HiTrash, HiPhone, HiHome, HiChevronDown } from 'react-icons/hi2'

import { fetchConfirmedOrders, updateOrderStatus, updateOrder, type Order } from '../../api/orders'
import { fetchDeliveryCompanies, type DeliveryCompany } from '../../api/delivery'
import { fetchProducts, type Product } from '../../api/products'
import Modal from '../../components/Modal'
import OrderMobileCard from '../../components/OrderMobileCard'
import { api } from '../../api'
import ColorSwatches from '../../components/ColorSwatches'
import ConfirmDialog from '../../components/ConfirmDialog'
import Select from '../../components/Select'
import NoestExportDialog from '../../components/NoestExportDialog'
import { generateOrderReport } from '../../utils/generateOrderReport'

type SortKey = 'newest' | 'oldest' | 'order_asc' | 'order_desc' | 'total_asc' | 'total_desc'

const sortLabels: Record<SortKey, string> = {
  newest: 'Plus récent',
  oldest: 'Plus ancien',
  order_asc: 'N° croissant',
  order_desc: 'N° décroissant',
  total_desc: 'Total décroissant',
  total_asc: 'Total croissant',
}

type DeliveryType = 'home' | 'stopdesk' | 'free'

interface WilayaOption {
  code: string
  name: string
  communes: string[]
}

interface EditItem {
  product: string
  name: string
  price: number
  quantity: number
  image: string
  volume?: string
  color?: string
  colorImage?: string
}

interface EditForm {
  firstName: string
  lastName: string
  phone: string
  wilaya: string
  commune: string
  address: string
  deliveryCompany: string
  deliveryType: DeliveryType
  items: EditItem[]
}

function initEditForm(order: Order): EditForm {
  return {
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    wilaya: order.wilaya,
    commune: order.commune,
    address: order.address,
    deliveryCompany: order.deliveryCompany?._id || '',
    deliveryType: order.deliveryCompany && order.deliveryMethod ? order.deliveryMethod : 'free',
    items: order.items.map(i => ({ product: i.product, name: i.name, price: i.price, quantity: i.quantity, image: i.image, volume: i.volume, color: i.color, colorImage: i.colorImage })),
  }
}

function itemCompoundKey(item: { product: string; volume?: string; color?: string }) {
  return `${String(item.product)}|${item.volume || ''}|${item.color || ''}`
}

export default function AdminOrdersConfirmed() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<Order | null>(null)
  const [shipConfirm, setShipConfirm] = useState<Order | null>(null)
  const [tab, setTab] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [wilayaFilter, setWilayaFilter] = useState('')
  const [deliveryCompanyFilter, setDeliveryCompanyFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<'ship' | 'cancel' | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [wilayas, setWilayas] = useState<WilayaOption[]>([])
  const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([])
  const [editOrder, setEditOrder] = useState<Order | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [removeItemConfirm, setRemoveItemConfirm] = useState<{ key: string; name: string } | null>(null)
  const [confirmSaveEdit, setConfirmSaveEdit] = useState(false)
  const [productCatalog, setProductCatalog] = useState<Record<string, Product>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchConfirmedOrders()
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api<WilayaOption[]>('/api/wilayas').then(setWilayas).catch(() => {})
    fetchDeliveryCompanies().then(setDeliveryCompanies).catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    fetchProducts()
      .then(list => {
        if (!alive) return
        const m: Record<string, Product> = {}
        for (const p of list) { m[p._id] = p; m[String(p.id)] = p }
        setProductCatalog(m)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const uniqueWilayas = useMemo(() => [...new Set(orders.map(o => o.wilaya))].sort(), [orders])
  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, string>()
    orders.forEach(o => { if (o.deliveryCompany?._id) map.set(o.deliveryCompany._id, o.deliveryCompany.abbreviation || o.deliveryCompany.name) })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [orders])

  const sortedWilayaOptions = useMemo(
    () => [...wilayas].sort((a, b) => Number(a.code) - Number(b.code)).map(w => `${w.code} - ${w.name}`),
    [wilayas]
  )

  function openEdit(order: Order) {
    setViewOrder(null)
    setEditOrder(order)
    setEditForm(initEditForm(order))
    setEditError('')
  }

  function closeEdit() {
    if (savingEdit) return
    if (editOrder) setViewOrder(editOrder)
    setEditOrder(null)
    setEditForm(null)
    setEditError('')
  }

  const editWilaya = useMemo(
    () => editForm ? wilayas.find(w => `${w.code} - ${w.name}` === editForm.wilaya) : undefined,
    [editForm, wilayas]
  )

  const editSubtotal = useMemo(
    () => editForm ? editForm.items.reduce((s, i) => s + i.price * i.quantity, 0) : 0,
    [editForm]
  )

  const editDeliveryCost = useMemo(() => {
    if (!editForm || editForm.deliveryType === 'free') return 0
    const company = deliveryCompanies.find(c => c._id === editForm.deliveryCompany)
    if (!company) return 0
    const code = editForm.wilaya.split(' - ')[0]
    const entry = company.prices.find(p => p.wilaya.code === code)
    if (!entry) return 0
    return editForm.deliveryType === 'home' ? (entry.homeDelivery ?? 0) : (entry.stopDesk ?? 0)
  }, [editForm, deliveryCompanies])

  const editTotal = editSubtotal + editDeliveryCost

  function changeItemQty(key: string, delta: number) {
    setEditForm(prev => {
      if (!prev) return prev
      return { ...prev, items: prev.items.map(i => itemCompoundKey(i) === key ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i) }
    })
  }

  function removeItem(key: string) {
    setEditForm(prev => {
      if (!prev || prev.items.length <= 1) return prev
      return { ...prev, items: prev.items.filter(i => itemCompoundKey(i) !== key) }
    })
  }

  function changeItemColor(key: string, colorName: string) {
    setEditForm(prev => {
      if (!prev) return prev
      return { ...prev, items: prev.items.map(i => {
        if (itemCompoundKey(i) !== key) return i
        const col = productCatalog[i.product]?.colors?.find(c => c.name === colorName)
        if (!col) return i
        return { ...i, color: col.name, colorImage: col.image, price: col.price }
      }) }
    })
  }

  async function handleSaveEdit() {
    if (!editOrder || !editForm || savingEdit) return
    if (!editForm.firstName.trim()) { setEditError('Le prénom est obligatoire'); return }
    if (!editForm.phone.trim()) { setEditError('Le téléphone est obligatoire'); return }
    if (editForm.items.length === 0) { setEditError('La commande doit contenir au moins un article'); return }
    setSavingEdit(true)
    setEditError('')
    try {
      const updated = await updateOrder(editOrder._id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        wilaya: editForm.wilaya,
        commune: editForm.commune,
        address: editForm.address.trim(),
        items: editForm.items,
        subtotal: editSubtotal,
        deliveryCompany: editForm.deliveryType === 'free' ? null : editForm.deliveryCompany || null,
        deliveryMethod: editForm.deliveryType === 'free' ? null : editForm.deliveryType,
        deliveryCost: editDeliveryCost,
        total: editTotal,
      })
      setOrders(prev => prev.map(o => o._id === updated._id ? updated : o))
      setViewOrder(updated)
      setEditOrder(null)
      setEditForm(null)
      setEditError('')
    } catch (e: any) {
      setEditError(e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSavingEdit(false)
    }
  }

  const companyTabs = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    orders.forEach(o => {
      const key = o.deliveryCompany?._id || '_none'
      const label = o.deliveryCompany?.abbreviation || o.deliveryCompany?.name || 'Sans transporteur'
      const existing = map.get(key)
      if (existing) existing.count++
      else map.set(key, { name: label, count: 1 })
    })
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name))
  }, [orders])

  const isNoestTab = useMemo(() => {
    if (tab === 'all' || tab === '_none') return false
    const company = companyTabs.find(([key]) => key === tab)
    if (!company) return false
    const name = company[1].name.toLowerCase()
    return name.includes('noest') || name.includes('nord')
  }, [tab, companyTabs])

  const tabLabel = useMemo(() => {
    if (tab === 'all') return 'Toutes les commandes'
    if (tab === '_none') return 'Sans transporteur'
    const company = companyTabs.find(([key]) => key === tab)
    return company ? company[1].name : 'Commandes'
  }, [tab, companyTabs])

  const activeFilterCount = useMemo(() => {
    let c = 0
    if (wilayaFilter) c++
    if (deliveryCompanyFilter) c++
    return c
  }, [wilayaFilter, deliveryCompanyFilter])

  const filtered = useMemo(() => {
    let result = orders

    if (tab !== 'all') {
      if (tab === '_none') result = result.filter(o => !o.deliveryCompany)
      else result = result.filter(o => o.deliveryCompany?._id === tab)
    }

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
  }, [orders, tab, search, wilayaFilter, deliveryCompanyFilter, sort])

  const noestOrders = useMemo(() => {
    if (!isNoestTab) return []
    return filtered
  }, [isNoestTab, filtered])

  function clearFilters() {
    setSearch('')
    setWilayaFilter('')
    setDeliveryCompanyFilter('')
    setSort('newest')
  }


  async function handleShip(id: string) {
    try {
      const updated = await updateOrderStatus(id, 'shipped')
      setOrders(prev => prev.filter(o => o._id !== id))
      if (viewOrder?._id === id) setViewOrder(updated)
    } catch {
      load()
    }
  }

  async function handleCancel(id: string) {
    try {
      await updateOrderStatus(id, 'cancelled')
      setOrders(prev => prev.filter(o => o._id !== id))
      setViewOrder(null)
      setCancelConfirm(null)
    } catch {
      load()
    }
  }

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    if (allSelected) setSelectedIds([])
    else setSelectedIds(filtered.map(o => o._id))
  }

  async function handleBulkShip() {
    try {
      await Promise.all(selectedIds.map(id => updateOrderStatus(id, 'shipped')))
      setOrders(prev => prev.filter(o => !selectedIds.includes(o._id)))
      setSelectedIds([])
      setBulkAction(null)
    } catch {
      load()
    }
  }

  async function handleBulkCancel() {
    try {
      await Promise.all(selectedIds.map(id => updateOrderStatus(id, 'cancelled')))
      setOrders(prev => prev.filter(o => !selectedIds.includes(o._id)))
      setSelectedIds([])
      setBulkAction(null)
    } catch {
      load()
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Commandes confirmées</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{orders.length} commande{orders.length !== 1 ? 's' : ''} à expédier</p>
          </div>
          <button onClick={load} className="ml-auto p-2 rounded-full text-white md:text-gray-400 bg-white/10 md:bg-transparent border border-white/15 md:border-transparent backdrop-blur-md md:backdrop-blur-none hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer" title="Actualiser">
            <HiArrowPath size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${tab === 'all' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:text-text hover:bg-gray-50'}`}
        >
          Tous
          <span className="ml-1.5 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{orders.length}</span>
        </button>
        {companyTabs.map(([key, { name, count }]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${tab === key ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:text-text hover:bg-gray-50'}`}
          >
            {name}
            <span className="ml-1.5 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{count}</span>
          </button>
        ))}
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
              <div className="w-full md:w-40 shrink-0">
                <Select value={deliveryCompanyFilter} onChange={setDeliveryCompanyFilter} options={uniqueCompanies.map(c => c[0])} placeholder="Tous transporteurs" formatOption={id => uniqueCompanies.find(c => c[0] === id)?.[1] || id} />
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
          {deliveryCompanyFilter && <Chip label={uniqueCompanies.find(c => c[0] === deliveryCompanyFilter)?.[1] || ''} onClear={() => setDeliveryCompanyFilter('')} />}
          <button onClick={clearFilters} className="text-[10px] font-medium text-gray-400 hover:text-primary transition-colors cursor-pointer ml-1">Tout effacer</button>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-400">{filtered.length} commande{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.length > 0 && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <button onClick={() => generateOrderReport(filtered, tabLabel, tab === 'all')} className="h-10 px-4 rounded-lg bg-primary hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center gap-1.5">
                <HiDocumentText size={14} /> Bon de préparation
              </button>
              {isNoestTab && (
                <button onClick={() => setExportOpen(true)} className="h-10 px-4 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center gap-1.5">
                  <HiDocumentArrowUp size={14} /> Export Noest
                </button>
              )}
            </div>
          )}
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
            <p className="text-sm font-medium text-gray-500 mb-1">Aucune commande confirmée</p>
            <p className="text-xs text-gray-400">Toutes les commandes ont été expédiées</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/80">
            {/* Select all header */}
            <div className="flex items-center px-3 py-2 bg-gray-50/80">
              <button onClick={toggleAll} className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer shrink-0 rounded-md ${allSelected ? 'bg-primary border-primary' : 'bg-white border-gray-300 hover:border-primary'}`}>
                {allSelected && <HiCheck size={10} className="text-white" />}
              </button>
              <span className="ml-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {selectedIds.length > 0 ? `${selectedIds.length} sélectionnée${selectedIds.length !== 1 ? 's' : ''}` : `${filtered.length} commande${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            {filtered.map(order => {
              const selected = selectedIds.includes(order._id)
              return (
              <div
                key={order._id}
                className={`transition-colors cursor-pointer ${selected ? 'bg-primary/5' : 'hover:bg-gray-50/50'}`}
                onClick={() => setViewOrder(order)}
              >
                <OrderMobileCard
                  order={order}
                  selected={selected}
                  onToggle={() => toggleSelect(order._id)}
                  badge={<span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold uppercase tracking-wider">Confirmée</span>}
                  detailLines={[
                    <p className="flex items-center gap-2 text-xs text-gray-500">
                      <HiTruck size={13} className="text-gray-300 shrink-0" />
                      <span>{order.deliveryCompany?.abbreviation || order.deliveryCompany?.name || 'Sans transporteur'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
                      <span>{order.deliveryMethod === 'home' ? 'Domicile' : 'Stop desk'}</span>
                    </p>,
                    ...(order.confirmedBy?.name ? [
                      <p className="flex items-center gap-2 text-xs text-gray-500">
                        <HiCheck size={13} className="text-gray-300 shrink-0" />
                        <span>Confirmée par <span className="font-medium text-gray-500">{order.confirmedBy.name}</span> ({order.confirmedBy.type === 'worker' ? 'Confirmateur' : 'Admin'})</span>
                        {order.confirmedBy.at ? <><span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" /><span>{new Date(order.confirmedBy.at).toLocaleDateString('fr-FR')}</span></> : null}
                      </p>,
                    ] : []),
                  ]}
                />
                <div className="hidden md:flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <button onClick={e => { e.stopPropagation(); toggleSelect(order._id) }} className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer shrink-0 rounded-md ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-300 hover:border-primary'}`}>
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
                      </p>
                      {order.confirmedBy?.name && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Confirmée par <span className="font-medium text-gray-500">{order.confirmedBy.name}</span> ({order.confirmedBy.type === 'worker' ? 'Confirmateur' : 'Admin'}) · {order.confirmedBy.at ? new Date(order.confirmedBy.at).toLocaleDateString('fr-FR') : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <HiChevronRight size={16} className="text-gray-300 shrink-0 ml-2" />
                </div>
              </div>
              )
            })}
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
                <button onClick={() => setBulkAction('ship')} className="h-9 px-4 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center gap-1.5">
                  <HiTruck size={14} /> Expédier
                </button>
                <button onClick={() => setBulkAction('cancel')} className="h-9 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                  <HiXMark size={14} /> Annuler {selectedIds.length > 1 ? 'les commandes' : 'la commande'}
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
                  <button onClick={() => { setActionsOpen(false); setBulkAction('ship') }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-foreground text-white transition-transform active:scale-[0.98] cursor-pointer">
                    <HiTruck size={16} className="text-blue-400" />
                    <span className="text-sm font-semibold">Expédier</span>
                  </button>
                  <button onClick={() => { setActionsOpen(false); setBulkAction('cancel') }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <HiXMark size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-text">Annuler {selectedIds.length > 1 ? 'les commandes' : 'la commande'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal open={viewOrder !== null} onClose={() => setViewOrder(null)} title={
        <div className="flex items-center gap-3">
          <span>{viewOrder ? `Commande #${viewOrder.orderNumber}` : ''}</span>
          {viewOrder && (
            <button onClick={() => openEdit(viewOrder)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer" title="Modifier">
              <HiPencil size={14} />
            </button>
          )}
        </div>
      } className="lg:ml-64" maxWidth="max-w-3xl">
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

            {/* Status action */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiTag size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Statut</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <HiCheck size={16} />
                  </div>
                  <p className="text-sm font-semibold text-text">Commande confirmée</p>
                </div>
                {viewOrder.confirmedBy?.name && (
                  <p className="text-[11px] text-gray-500">
                    Confirmée par {viewOrder.confirmedBy.name} ({viewOrder.confirmedBy.type === 'worker' ? 'Confirmateur' : 'Admin'})
                    {viewOrder.confirmedBy.at ? ` le ${new Date(viewOrder.confirmedBy.at).toLocaleDateString('fr-FR')} à ${new Date(viewOrder.confirmedBy.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                )}
                {viewOrder.cancelledBy?.name && (
                  <p className="text-[11px] text-gray-500">
                    Annulée par {viewOrder.cancelledBy.name} ({viewOrder.cancelledBy.type === 'worker' ? 'Confirmateur' : 'Admin'})
                    {viewOrder.cancelledBy.at ? ` le ${new Date(viewOrder.cancelledBy.at).toLocaleDateString('fr-FR')} à ${new Date(viewOrder.cancelledBy.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                  <button onClick={() => setShipConfirm(viewOrder)} className="h-10 px-5 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                    <HiTruck size={14} /> Expédier
                  </button>
                  <button onClick={() => setCancelConfirm(viewOrder)} className="h-10 px-5 rounded-lg bg-foreground/5 border border-foreground/15 text-foreground hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                    <HiXMark size={14} /> Annuler {selectedIds.length > 1 ? 'les commandes' : 'la commande'}
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery */}
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
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-text whitespace-pre-wrap">{viewOrder.orderNote}</p>
                </div>
              </div>
            )}

            {/* Items */}
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

      {/* Edit Modal */}
      <Modal open={editOrder !== null} onClose={closeEdit} title={editOrder ? `Modifier la commande #${editOrder.orderNumber}` : ''} className="lg:ml-64" maxWidth="max-w-2xl">
        {editForm && (
          <div className="space-y-5">
            {/* Section: Client */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <HiUser size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Prénom *</label>
                  <input type="text" value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nom</label>
                  <input type="text" value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Téléphone *</label>
                  <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Wilaya</label>
                  <Select value={editForm.wilaya} onChange={v => {
                    const w = wilayas.find(x => `${x.code} - ${x.name}` === v)
                    setEditForm({ ...editForm, wilaya: v, commune: w && w.communes.includes(editForm.commune) ? editForm.commune : '' })
                  }} options={sortedWilayaOptions} placeholder="Sélectionner" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Commune</label>
                  <Select value={editForm.commune} onChange={v => setEditForm({ ...editForm, commune: v })} options={editWilaya?.communes || []} placeholder="Sélectionner" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Adresse</label>
                  <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
              </div>
            </div>

            {/* Section: Livraison */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <HiMapPin size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Livraison</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Transporteur</label>
                  <Select
                    value={editForm.deliveryCompany}
                    onChange={v => setEditForm({ ...editForm, deliveryCompany: v })}
                    options={deliveryCompanies.map(c => c._id)}
                    placeholder="Aucun (gratuit)"
                    formatOption={id => deliveryCompanies.find(c => c._id === id)?.abbreviation || deliveryCompanies.find(c => c._id === id)?.name || id}
                    disabled={editForm.deliveryType === 'free'}
                    disabledPlaceholder="Gratuit"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Type de livraison</label>
                  <Select value={editForm.deliveryType} onChange={v => setEditForm({ ...editForm, deliveryType: v as DeliveryType })} options={['home', 'stopdesk', 'free']} formatOption={t => t === 'home' ? 'À domicile' : t === 'stopdesk' ? 'Stop desk' : 'Gratuit'} />
                </div>
              </div>
            </div>

            {/* Section: Articles */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <HiShoppingBag size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Articles ({editForm.items.length})</h3>
              </div>
              <div className="rounded-none border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {editForm.items.map((item, i) => (
                  <div key={itemCompoundKey(item)} className={`flex items-center gap-3 px-3 py-3 flex-wrap sm:flex-nowrap ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    {item.image && (
                      <div className="w-12 h-12 sm:w-[52px] sm:h-[52px] bg-gray-100 shrink-0 overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                      <p className="text-sm font-medium text-text line-clamp-2 sm:truncate min-w-0">{item.name}</p>
                      {(() => {
                        const cols = productCatalog[item.product]?.colors ?? []
                        if (cols.length > 0) {
                          return (
                            <ColorSwatches
                              colors={cols}
                              selectedName={item.color}
                              onSelect={name => changeItemColor(itemCompoundKey(item), name)}
                              size="sm"
                            />
                          )
                        }
                        if (!item.color && item.volume) {
                          return <span className="text-xs text-gray-400 truncate">{item.volume}</span>
                        }
                        return null
                      })()}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => changeItemQty(itemCompoundKey(item), -1)} title="Réduire" className="w-8 h-8 sm:w-7 sm:h-7 rounded-md flex items-center justify-center border border-gray-200 text-gray-500 hover:text-primary hover:border-primary transition-all cursor-pointer">
                          <HiMinus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-text">{item.quantity}</span>
                        <button onClick={() => changeItemQty(itemCompoundKey(item), 1)} title="Augmenter" className="w-8 h-8 sm:w-7 sm:h-7 rounded-md flex items-center justify-center border border-gray-200 text-gray-500 hover:text-primary hover:border-primary transition-all cursor-pointer">
                          <HiPlus size={12} />
                        </button>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{Math.round(item.price)} DA / unité</p>
                        <p className="text-sm font-semibold text-text">{Math.round(item.price * item.quantity)} DA</p>
                      </div>
                      <button onClick={() => setRemoveItemConfirm({ key: itemCompoundKey(item), name: item.name })} disabled={editForm.items.length <= 1} title="Retirer" className="p-2 sm:p-1.5 rounded-md text-gray-400 hover:text-red-500 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                        <HiTrash size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Total */}
            <div className="rounded-none bg-gray-50 border border-gray-200 p-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sous-total</span>
                  <span className="text-text font-medium">{Math.round(editSubtotal)} DA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Livraison</span>
                  <span className="text-text font-medium">{editDeliveryCost > 0 ? `${Math.round(editDeliveryCost)} DA` : 'Gratuit'}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-bold text-text">Total</span>
                  <span className="font-bold text-primary text-base">{Math.round(editTotal)} DA</span>
                </div>
              </div>
            </div>

            {editError && (
              <p className="text-xs font-medium text-red-500">{editError}</p>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button onClick={closeEdit} className="h-11 sm:h-10 px-5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer w-full sm:w-auto">Annuler</button>
              <button onClick={() => setConfirmSaveEdit(true)} disabled={savingEdit} className="h-11 sm:h-10 px-5 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                {savingEdit ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <HiCheck size={14} />} Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remove item confirm */}
      <ConfirmDialog
        open={confirmSaveEdit}
        title="Enregistrer les modifications"
        message={`Voulez-vous enregistrer les modifications de la commande #${editOrder?.orderNumber} ?`}
        confirmLabel="Enregistrer"
        onConfirm={() => { setConfirmSaveEdit(false); handleSaveEdit() }}
        onCancel={() => setConfirmSaveEdit(false)}
      />

      <ConfirmDialog
        open={removeItemConfirm !== null}
        title="Retirer l'article"
        message={`Voulez-vous retirer "${removeItemConfirm?.name}" de la commande ?`}
        confirmLabel="Retirer"
        onConfirm={() => { if (removeItemConfirm) removeItem(removeItemConfirm.key); setRemoveItemConfirm(null) }}
        onCancel={() => setRemoveItemConfirm(null)}
      />

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={cancelConfirm !== null}
        title="Annuler la commande"
        message={`Voulez-vous annuler la commande #${cancelConfirm?.orderNumber} ? Les produits seront remis en stock automatiquement.`}
        confirmLabel="Confirmer"
        onConfirm={() => cancelConfirm && handleCancel(cancelConfirm._id)}
        onCancel={() => setCancelConfirm(null)}
      />

      {/* Ship Confirm */}
      <ConfirmDialog
        open={shipConfirm !== null}
        title="Expédier la commande"
        message={`Voulez-vous expédier la commande #${shipConfirm?.orderNumber} ?`}
        confirmLabel="Expédier"
        onConfirm={() => shipConfirm && handleShip(shipConfirm._id)}
        onCancel={() => setShipConfirm(null)}
      />

      {/* Bulk ship confirm */}
      <ConfirmDialog
        open={bulkAction === 'ship'}
        title="Expédier les commandes"
        message={`Voulez-vous expédier les ${selectedIds.length} commande${selectedIds.length !== 1 ? 's' : ''} sélectionnée${selectedIds.length !== 1 ? 's' : ''} ?`}
        confirmLabel="Expédier"
        onConfirm={handleBulkShip}
        onCancel={() => setBulkAction(null)}
      />

      {/* Bulk cancel confirm */}
      <ConfirmDialog
        open={bulkAction === 'cancel'}
        title="Annuler les commandes"
        message={`Voulez-vous annuler les ${selectedIds.length} commande${selectedIds.length !== 1 ? 's' : ''} sélectionnée${selectedIds.length !== 1 ? 's' : ''} ? Les produits seront remis en stock automatiquement.`}
        confirmLabel="Confirmer"
        onConfirm={handleBulkCancel}
        onCancel={() => setBulkAction(null)}
      />

      {/* Noest Export Dialog */}
      {exportOpen && (
        <NoestExportDialog
          key={`noest-export-${noestOrders.length}-${Date.now()}`}
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          orders={noestOrders}
        />
      )}
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
