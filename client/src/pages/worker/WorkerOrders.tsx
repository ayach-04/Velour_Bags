import { useState, useEffect, useMemo } from 'react'
import {
  HiMagnifyingGlass,
  HiArrowPath,
  HiCheck,
  HiXMark,
  HiPhone,
  HiPencil,
  HiMinus,
  HiPlus,
  HiTrash,
  HiUser,
  HiMapPin,
  HiShoppingBag,
  HiTruck,
  HiChevronRight,
} from 'react-icons/hi2'
import { fetchWorkerOrders, confirmOrder, cancelOrder, updateWorkerOrder } from '../../api/workers'
import type { Order } from '../../api/orders'
import { fetchProducts, type Product } from '../../api/products'
import { api } from '../../api'
import { fetchDeliveryCompanies, type DeliveryCompany } from '../../api/delivery'
import Modal from '../../components/Modal'
import ColorSwatches from '../../components/ColorSwatches'
import Select from '../../components/Select'
import ConfirmDialog from '../../components/ConfirmDialog'

const statusLabels: Record<string, string> = {
  not_confirmed: 'Non confirmée',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  archived: 'Archivée',
  returned: 'Retournée',
}

const statusColors: Record<string, string> = {
  not_confirmed: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-500',
  returned: 'bg-orange-100 text-orange-700',
}

type SortKey = 'newest' | 'oldest' | 'order_asc' | 'order_desc' | 'total_asc' | 'total_desc' | 'products_desc' | 'products_asc'

const sortLabels: Record<SortKey, string> = {
  newest: 'Plus récent',
  oldest: 'Plus ancien',
  order_asc: 'N° croissant',
  order_desc: 'N° décroissant',
  total_desc: 'Total décroissant',
  total_asc: 'Total croissant',
  products_desc: 'Plus d\'articles',
  products_asc: 'Moins d\'articles',
}

function fmtDate(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(n: number) {
  return n.toLocaleString('fr-FR') + ' DA'
}

interface WilayaOption {
  code: string
  name: string
  communes: string[]
}

type DeliveryType = 'home' | 'stopdesk' | 'free'

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

export default function WorkerOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [wilayas, setWilayas] = useState<WilayaOption[]>([])
  const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([])
  const [editOrder, setEditOrder] = useState<Order | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [removeItemConfirm, setRemoveItemConfirm] = useState<{ key: string; name: string } | null>(null)
  const [productCatalog, setProductCatalog] = useState<Record<string, Product>>({})

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchWorkerOrders()
      setOrders(data.orders)
    } catch {
      setError('Impossible de charger les commandes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

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

  const filtered = useMemo(() => {
    let result = orders
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(o =>
        o.firstName.toLowerCase().includes(q) ||
        o.lastName.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        String(o.orderNumber).includes(q)
      )
    }

    switch (sort) {
      case 'newest': result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'oldest': result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break
      case 'order_asc': result = [...result].sort((a, b) => a.orderNumber - b.orderNumber); break
      case 'order_desc': result = [...result].sort((a, b) => b.orderNumber - a.orderNumber); break
      case 'total_desc': result = [...result].sort((a, b) => b.total - a.total); break
      case 'total_asc': result = [...result].sort((a, b) => a.total - b.total); break
      case 'products_desc': result = [...result].sort((a, b) => b.items.reduce((s, i) => s + i.quantity, 0) - a.items.reduce((s, i) => s + i.quantity, 0)); break
      case 'products_asc': result = [...result].sort((a, b) => a.items.reduce((s, i) => s + i.quantity, 0) - b.items.reduce((s, i) => s + i.quantity, 0)); break
    }

    return result
  }, [orders, search, sort])

  const confirmTarget = useMemo(
    () => orders.find(o => o._id === confirmOrderId) ?? null,
    [orders, confirmOrderId]
  )

  const cancelTarget = useMemo(
    () => orders.find(o => o._id === cancelOrderId) ?? null,
    [orders, cancelOrderId]
  )

  const sortedWilayaOptions = useMemo(
    () => [...wilayas].sort((a, b) => Number(a.code) - Number(b.code)).map(w => `${w.code} - ${w.name}`),
    [wilayas]
  )

  async function handleConfirm() {
    if (!confirmOrderId) return
    setConfirming(true)
    try {
      await confirmOrder(confirmOrderId)
      setOrders(prev => prev.filter(o => o._id !== confirmOrderId))
      setViewOrder(null)
      setConfirmOrderId(null)
    } catch (err: any) {
      alert(err?.body?.error || err?.message || 'Erreur lors de la confirmation')
    } finally {
      setConfirming(false)
    }
  }

  async function handleCancel() {
    if (!cancelOrderId) return
    setCancelling(true)
    try {
      await cancelOrder(cancelOrderId)
      setOrders(prev => prev.filter(o => o._id !== cancelOrderId))
      setViewOrder(null)
      setCancelOrderId(null)
    } catch (err: any) {
      alert(err?.body?.error || err?.message || 'Erreur lors de l\'annulation')
    } finally {
      setCancelling(false)
    }
  }

  function openEdit(order: Order) {
    setEditOrder(order)
    setEditForm(initEditForm(order))
    setEditError('')
  }

  function closeEdit() {
    if (savingEdit) return
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
      const updated = await updateWorkerOrder(editOrder._id, {
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
      setEditError(e.body?.error || e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-[#0f0f1a] md:bg-white/80 md:backdrop-blur-xl border-b border-white/10 md:border-gray-200/60 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Commandes</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{orders.length} commande{orders.length > 1 ? 's' : ''} à confirmer</p>
          </div>
          <button onClick={load} className="ml-auto p-2 rounded-full text-white md:text-gray-400 bg-white/10 md:bg-transparent border border-white/15 md:border-transparent backdrop-blur-md md:backdrop-blur-none hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer" title="Actualiser">
            <HiArrowPath size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 mb-4">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <HiMagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher (nom, téléphone, n°)..."
            className="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary rounded-lg transition-all"
          />
        </div>
        <div className="sm:w-48 shrink-0">
          <Select value={sort} onChange={v => setSort(v as SortKey)} options={Object.keys(sortLabels) as SortKey[]} placeholder="Trier par" formatOption={k => sortLabels[k as SortKey]} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 && (
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl py-12 text-center">
                <p className="text-sm text-gray-400">{search ? 'Aucun résultat trouvé' : 'Aucune commande à confirmer'}</p>
              </div>
            )}
            {filtered.map(order => (
              <div key={order._id} className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 cursor-pointer" onClick={() => setViewOrder(order)}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-primary">#{order.orderNumber}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusColors[order.status] || 'bg-gray-100 text-gray-500'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  <HiChevronRight size={16} className="text-gray-300 ml-auto shrink-0" />
                </div>
                <p className="text-[15px] font-semibold text-text mt-2.5 truncate">{order.firstName} {order.lastName}</p>
                <div className="mt-2.5 space-y-1.5">
                  <p className="flex items-center gap-2 text-xs text-gray-500">
                    <HiPhone size={13} className="text-gray-300 shrink-0" />
                    <span className="truncate">{order.phone}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
                    <span className="truncate">{order.wilaya}</span>
                  </p>
                  <p className="flex items-center gap-2 text-xs text-gray-500">
                    <HiShoppingBag size={13} className="text-gray-300 shrink-0" />
                    <span>{order.items.reduce((s, i) => s + i.quantity, 0)} article{order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
                    <span>{fmtDate(order.createdAt)}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <span className="text-[15px] font-bold text-text tabular-nums">{fmtMoney(order.total)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmOrderId(order._id) }}
                    className="h-9 px-4 rounded-lg bg-[#1a1a2e] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 cursor-pointer"
                  >
                    <HiCheck size={13} /> Confirmer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">N°</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Wilaya</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Articles</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                    {search ? 'Aucun résultat trouvé' : 'Aucune commande à confirmer'}
                  </td>
                </tr>
              )}
              {filtered.map(order => (
                <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold text-primary">#{order.orderNumber}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-text">{order.firstName} {order.lastName}</p>
                    <p className="text-xs text-gray-400">{order.phone}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{order.wilaya}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{order.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-text">{fmtMoney(order.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-500'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{fmtDate(order.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setViewOrder(order)}
                        className="h-8 px-3 bg-[#1a1a2e] hover:scale-105 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-transform cursor-pointer flex items-center gap-1"
                      >
                        <HiCheck size={12} /> Confirmer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      <Modal
        open={viewOrder !== null}
        onClose={() => setViewOrder(null)}
        title={
          <div className="flex items-center gap-3">
            <span>{viewOrder ? `Commande #${viewOrder.orderNumber}` : ''}</span>
            {viewOrder && (
              <button onClick={() => openEdit(viewOrder)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer" title="Modifier">
                <HiPencil size={14} />
              </button>
            )}
          </div>
        }
        className="lg:ml-64"
        maxWidth="max-w-2xl"
      >
        {viewOrder && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <HiPhone size={18} />
              </div>
              <p className="text-sm font-semibold text-text">
                Appelez le client au{' '}
                <a href={`tel:${viewOrder.phone}`} className="text-primary font-bold underline decoration-primary/30 underline-offset-2">{viewOrder.phone}</a>{' '}
                pour confirmer la commande
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiUser size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Client</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="px-4 py-3 sm:border-r border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nom complet</span>
                  <span className="text-sm font-medium text-text">{viewOrder.firstName} {viewOrder.lastName}</span>
                </div>
                <div className="px-4 py-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Téléphone</span>
                  <a href={`tel:${viewOrder.phone}`} className="text-sm font-medium text-primary">{viewOrder.phone}</a>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiMapPin size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Adresse</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="px-4 py-3 sm:border-r border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Wilaya</span>
                  <span className="text-sm font-medium text-text">{viewOrder.wilaya}</span>
                </div>
                <div className="px-4 py-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Commune</span>
                  <span className="text-sm font-medium text-text">{viewOrder.commune || '-'}</span>
                </div>
                <div className="px-4 py-3 sm:col-span-2 sm:border-t border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Adresse</span>
                  <span className="text-sm font-medium text-text">{viewOrder.address || '-'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiTruck size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Livraison</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="px-4 py-3 sm:border-r border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Transporteur</span>
                  <span className="text-sm font-medium text-text">
                    {viewOrder.deliveryCompany?.name || (viewOrder.deliveryMethod === 'home' ? 'À domicile' : viewOrder.deliveryMethod === 'stopdesk' ? 'Stop desk' : 'Gratuite')}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Coût</span>
                  <span className="text-sm font-medium text-text">{viewOrder.deliveryCost > 0 ? fmtMoney(viewOrder.deliveryCost) : 'Gratuite'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiShoppingBag size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Articles ({viewOrder.items.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {viewOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    {item.image ? (
                      <div className="relative shrink-0">
                        <img src={item.image} alt={item.name} className="w-12 h-12 sm:w-10 sm:h-10 object-contain ring-1 ring-gray-100 bg-white rounded-xl" />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1a1a2e] text-white text-[10px] font-bold flex items-center justify-center sm:hidden">×{item.quantity}</span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gray-100 flex items-center justify-center shrink-0">
                        <HiShoppingBag size={14} className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="block text-sm font-medium text-text line-clamp-2 sm:truncate">{item.name}</p>
                      {!item.color && item.volume && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.volume}</p>
                      )}
                      <p className="text-xs text-gray-400 sm:hidden">{fmtMoney(item.price)} l'unité</p>
                      <p className="text-xs text-gray-400 hidden sm:block">{item.quantity} × {fmtMoney(item.price)}</p>
                    </div>
                    <span className="text-sm font-semibold text-text shrink-0">{fmtMoney(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-500">Sous-total</span>
                  <span className="text-sm font-medium text-text">{fmtMoney(viewOrder.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-500">Livraison</span>
                  <span className="text-sm font-medium text-text">{viewOrder.deliveryCost > 0 ? fmtMoney(viewOrder.deliveryCost) : 'Gratuite'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="text-sm font-bold text-text">Total</span>
                  <span className="text-base font-bold text-primary">{fmtMoney(viewOrder.total)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setConfirmOrderId(viewOrder._id)}
                className="w-full h-11 rounded-lg bg-[#1a1a2e] hover:scale-[1.01] text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center justify-center gap-1.5"
              >
                <HiCheck size={14} /> Confirmer la commande
              </button>
              <button
                onClick={() => setCancelOrderId(viewOrder._id)}
                className="w-full h-10 rounded-lg bg-[#1a1a2e]/5 border border-[#1a1a2e]/15 text-[#1a1a2e] hover:bg-[#1a1a2e]/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <HiXMark size={14} /> Annuler la commande
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={editOrder !== null} onClose={closeEdit} title={editOrder ? `Modifier la commande #${editOrder.orderNumber}` : ''} className="lg:ml-64" maxWidth="max-w-2xl">
        {editForm && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <HiUser size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Prénom *</label>
                  <input type="text" value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nom</label>
                  <input type="text" value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Téléphone *</label>
                  <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
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
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Adresse</label>
                  <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <HiMapPin size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Livraison</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <HiShoppingBag size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Articles ({editForm.items.length})</h3>
              </div>
              <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {editForm.items.map((item, i) => (
                  <div key={itemCompoundKey(item)} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    {item.image && (
                      <div className="w-11 h-11 bg-gray-100 shrink-0 rounded-lg overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
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
                      <span className="text-xs text-gray-400 shrink-0">{Math.round(item.price)} DA / unité</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => changeItemQty(itemCompoundKey(item), -1)} title="Réduire" className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center border border-gray-200 text-gray-500 hover:text-primary hover:border-primary rounded-md transition-all cursor-pointer">
                        <HiMinus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-text">{item.quantity}</span>
                      <button onClick={() => changeItemQty(itemCompoundKey(item), 1)} title="Augmenter" className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center border border-gray-200 text-gray-500 hover:text-primary hover:border-primary rounded-md transition-all cursor-pointer">
                        <HiPlus size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-text w-20 text-right shrink-0">{Math.round(item.price * item.quantity)} DA</span>
                    <button onClick={() => setRemoveItemConfirm({ key: itemCompoundKey(item), name: item.name })} disabled={editForm.items.length <= 1} title="Retirer" className="p-2 sm:p-1.5 text-gray-400 hover:text-red-500 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                      <HiTrash size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
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
              <button onClick={closeEdit} className="h-11 sm:h-10 px-5 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer w-full sm:w-auto">Annuler</button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="h-11 sm:h-10 px-5 bg-[#1a1a2e] hover:scale-105 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-transform cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                {savingEdit ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <HiCheck size={14} />} Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmOrderId}
        title="Confirmer la commande"
        message={`Voulez-vous confirmer la commande #${confirmTarget?.orderNumber ?? ''} ?`}
        confirmLabel={confirming ? 'Confirmation...' : 'Confirmer'}
        onCancel={() => setConfirmOrderId(null)}
        onConfirm={handleConfirm}
      />

      <ConfirmDialog
        open={!!cancelOrderId}
        title="Annuler la commande"
        message={`Voulez-vous annuler la commande #${cancelTarget?.orderNumber ?? ''} ? Les produits seront remis en stock automatiquement.`}
        confirmLabel={cancelling ? 'Annulation...' : 'Annuler'}
        onCancel={() => setCancelOrderId(null)}
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={removeItemConfirm !== null}
        title="Retirer l'article"
        message={`Voulez-vous retirer "${removeItemConfirm?.name}" de la commande ?`}
        confirmLabel="Retirer"
        onConfirm={() => { if (removeItemConfirm) removeItem(removeItemConfirm.key); setRemoveItemConfirm(null) }}
        onCancel={() => setRemoveItemConfirm(null)}
      />
    </div>
  )
}
