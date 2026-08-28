import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HiMagnifyingGlass, HiChevronDown, HiCheck, HiXMark, HiTruck, HiArrowPath, HiUser, HiMapPin, HiTag, HiShoppingBag, HiRectangleGroup, HiPhone, HiFunnel, HiTrash, HiArrowUturnLeft, HiPencil, HiMinus, HiPlus, HiHome } from 'react-icons/hi2'
import { fetchActiveOrders, fetchCancelledOrders, updateOrderStatus, updateOrder, deleteOrders, reactivateOrder, restoreOrderStock, type Order } from '../../api/orders'
import { fetchDeliveryCompanies, type DeliveryCompany } from '../../api/delivery'
import { fetchProducts, type Product } from '../../api/products'
import { api } from '../../api'
import Modal from '../../components/Modal'
import ColorSwatches from '../../components/ColorSwatches'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import ConfirmDialog from '../../components/ConfirmDialog'
import ReactivateDialog, { type ReactivateConflict } from '../../components/ReactivateDialog'
import ShippedReturnDialog from '../../components/ShippedReturnDialog'
import OrderActorInfo from '../../components/OrderActorInfo'

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

interface Filters {
  dateFrom: string
  dateTo: string
  status: string
  wilaya: string
  deliveryMethod: string
  deliveryCompany: string
}

const emptyFilters: Filters = { dateFrom: '', dateTo: '', status: '', wilaya: '', deliveryMethod: '', deliveryCompany: '' }

const STATUS_FILTERS = ['not_confirmed', 'confirmed', 'shipped', 'returned', 'cancelled']

function getSingleConfirmProps(action: { type: string; order: Order }) {
  switch (action.type) {
    case 'confirm': return { title: 'Confirmer la commande', message: `Voulez-vous confirmer la commande #${action.order.orderNumber} ?`, label: 'Confirmer' }
    case 'ship': return { title: 'Expédier la commande', message: `Voulez-vous expédier la commande #${action.order.orderNumber} ?`, label: 'Expédier' }
    case 'deliver': return { title: 'Marquer comme livrée', message: `Voulez-vous marquer la commande #${action.order.orderNumber} comme livrée ?`, label: 'Livrer' }
    case 'back': return { title: 'Marquer non expédiée', message: `La commande #${action.order.orderNumber} n'a pas encore été expédiée. Voulez-vous la marquer comme non expédiée ?`, label: 'Marquer' }
    case 'cancel': return { title: 'Annuler la commande', message: `Voulez-vous annuler la commande #${action.order.orderNumber} ? Les produits seront remis en stock automatiquement.`, label: 'Confirmer' }
    case 'reactivate': return { title: 'Réactiver la commande', message: `Voulez-vous réactiver la commande #${action.order.orderNumber} ?`, label: 'Réactiver' }
    default: return { title: '', message: '', label: 'Confirmer' }
  }
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

export default function AdminOrders() {
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<Filters>(() => {
    const s = searchParams.get('status')
    return { ...emptyFilters, status: s && STATUS_FILTERS.includes(s) ? s : '' }
  })
  const [sort, setSort] = useState<SortKey>('newest')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Order | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'confirm' | 'ship' | 'deliver' | 'back' | 'cancel' | 'reactivate'; order: Order } | null>(null)
  const [bulkAction, setBulkAction] = useState<'confirm' | 'cancel' | 'reactivate' | null>(null)
  const pendingStatusChanges = useRef(new Set<string>())
  const pendingReactivate = useRef(new Set<string>())
  const [shippedReturnTarget, setShippedReturnTarget] = useState<Order | null>(null)
  const [bulkReturnOpen, setBulkReturnOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
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
      const [active, cancelled] = await Promise.all([fetchActiveOrders(), fetchCancelledOrders()])
      setActiveOrders(active)
      setCancelledOrders(cancelled)
    } catch {
      setActiveOrders([])
      setCancelledOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

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

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (filters.status) params.set('status', filters.status)
    else params.delete('status')
    const next = params.toString()
    if (next !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [filters.status])

  useEffect(() => {
    const s = searchParams.get('status')
    setFilters(prev => {
      const next = s && STATUS_FILTERS.includes(s) ? s : ''
      return next === prev.status ? prev : { ...prev, status: next }
    })
  }, [searchParams])

  useEffect(() => {
    api<WilayaOption[]>('/api/wilayas').then(setWilayas).catch(() => {})
    fetchDeliveryCompanies().then(setDeliveryCompanies).catch(() => {})
  }, [])

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
      setActiveOrders(prev => prev.map(o => o._id === updated._id ? updated : o))
      setCancelledOrders(prev => prev.map(o => o._id === updated._id ? updated : o))
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

  const orders = useMemo(() => [...activeOrders, ...cancelledOrders], [activeOrders, cancelledOrders])

  const uniqueWilayas = useMemo(() => [...new Set(orders.map(o => o.wilaya))].sort(), [orders])
  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, string>()
    orders.forEach(o => { if (o.deliveryCompany) map.set(o.deliveryCompany._id, o.deliveryCompany.abbreviation || o.deliveryCompany.name) })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [orders])

  const activeFilterCount = useMemo(() => {
    let c = 0
    if (filters.dateFrom) c++
    if (filters.dateTo) c++
    if (filters.status) c++
    if (filters.wilaya) c++
    if (filters.deliveryMethod) c++
    if (filters.deliveryCompany) c++
    return c
  }, [filters])

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

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime()
      result = result.filter(o => new Date(o.createdAt).getTime() >= from)
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime() + 86400000
      result = result.filter(o => new Date(o.createdAt).getTime() < to)
    }
    if (filters.status) {
      result = result.filter(o => o.status === filters.status)
    }
    if (filters.wilaya) {
      result = result.filter(o => o.wilaya === filters.wilaya)
    }
    if (filters.deliveryMethod) {
      result = result.filter(o => o.deliveryMethod === filters.deliveryMethod)
    }
    if (filters.deliveryCompany) {
      result = result.filter(o => o.deliveryCompany?._id === filters.deliveryCompany)
    }

    switch (sort) {
      case 'newest': result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'oldest': result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break
      case 'order_asc': result = [...result].sort((a, b) => a.orderNumber - b.orderNumber); break
      case 'order_desc': result = [...result].sort((a, b) => b.orderNumber - a.orderNumber); break
      case 'total_desc': result = [...result].sort((a, b) => b.total - a.total); break
      case 'total_asc': result = [...result].sort((a, b) => a.total - b.total); break
      case 'products_desc': result = [...result].sort((a, b) => b.items.length - a.items.length); break
      case 'products_asc': result = [...result].sort((a, b) => a.items.length - b.items.length); break
    }

    return result
  }, [orders, search, filters, sort])

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters(emptyFilters)
    setSearch('')
  }

  function applyQuickDate(days: number) {
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - days)
    setFilters(prev => ({
      ...prev,
      dateFrom: from.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    }))
  }

  const quickDates = [
    { label: 'Aujourd\'hui', days: 0 },
    { label: '3 jours', days: 3 },
    { label: '7 jours', days: 7 },
    { label: '30 jours', days: 30 },
  ]

  async function handleStatusChange(id: string, status: string) {
    if (pendingStatusChanges.current.has(id)) return
    pendingStatusChanges.current.add(id)
    const prevOrder = viewOrder?._id === id ? viewOrder : null
    if (prevOrder) {
      const optimistic = { ...prevOrder, status: status as Order['status'] }
      setViewOrder(optimistic)
    }
    try {
      const updated = await updateOrderStatus(id, status)
      pendingStatusChanges.current.delete(id)
      if (status === 'cancelled') {
        setActiveOrders(prev => prev.filter(o => o._id !== id))
        setCancelledOrders(prev => prev.filter(o => o._id !== id))
        setCancelledOrders(prev => [updated, ...prev])
      } else if (status === 'returned') {
        setActiveOrders(prev => prev.filter(o => o._id !== id))
        setCancelledOrders(prev => prev.filter(o => o._id !== id))
      } else {
        setCancelledOrders(prev => prev.filter(o => o._id !== id))
        setActiveOrders(prev => {
          const exists = prev.find(o => o._id === id)
          if (exists) return prev.map(o => (o._id === id ? updated : o))
          return [updated, ...prev]
        })
      }
      if (viewOrder?._id === id) setViewOrder(updated)
    } catch {
      pendingStatusChanges.current.delete(id)
      if (prevOrder) setViewOrder(prevOrder)
      load()
    }
  }

  async function handleBulkConfirm() {
    const ids = selectedIds.filter(id => !pendingStatusChanges.current.has(id))
    if (!ids.length) return
    ids.forEach(id => pendingStatusChanges.current.add(id))
    for (const id of ids) {
      const order = orders.find(o => o._id === id)
      if (!order || order.status !== 'not_confirmed') continue
      try {
        const updated = await updateOrderStatus(id, 'confirmed')
        setCancelledOrders(prev => prev.filter(o => o._id !== id))
        setActiveOrders(prev => {
          const exists = prev.find(o => o._id === id)
          if (exists) return prev.map(o => (o._id === id ? updated : o))
          return [updated, ...prev]
        })
      } catch { /* continue */ }
    }
    ids.forEach(id => pendingStatusChanges.current.delete(id))
    setSelectedIds([])
    setBulkAction(null)
  }

  async function handleBulkCancel() {
    const ids = selectedIds.filter(id => !pendingStatusChanges.current.has(id))
    if (!ids.length) return
    ids.forEach(id => pendingStatusChanges.current.add(id))
    for (const id of ids) {
      const order = orders.find(o => o._id === id)
      if (!order || (order.status !== 'not_confirmed' && order.status !== 'confirmed')) continue
      try {
        const updated = await updateOrderStatus(id, 'cancelled')
        setActiveOrders(prev => prev.filter(o => o._id !== id))
        setCancelledOrders(prev => prev.filter(o => o._id !== id))
        setCancelledOrders(prev => [updated, ...prev])
      } catch { /* continue */ }
    }
    ids.forEach(id => pendingStatusChanges.current.delete(id))
    setSelectedIds([])
    setBulkAction(null)
  }

  const [reactivateConflicts, setReactivateConflicts] = useState<ReactivateConflict[]>([])
  const [reactivateLoading, setReactivateLoading] = useState(false)

  async function handleBulkReactivate() {
    const ids = selectedIds.filter(id => !pendingReactivate.current.has(id))
    if (!ids.length) return
    ids.forEach(id => pendingReactivate.current.add(id))
    const conflicts: ReactivateConflict[] = []
    for (const id of ids) {
      const order = orders.find(o => o._id === id)
      if (!order || order.status !== 'cancelled') continue
      try {
        const updated = await reactivateOrder(id)
        setCancelledOrders(prev => prev.filter(o => o._id !== id))
        setActiveOrders(prev => {
          if (prev.find(o => o._id === id)) return prev
          return [updated, ...prev]
        })
      } catch (err: any) {
        if (err?.body?.outOfStock?.length) {
          conflicts.push({ orderId: id, orderNumber: order.orderNumber, items: err.body.outOfStock, totalItems: order.items.length })
        }
      } finally {
        pendingReactivate.current.delete(id)
      }
    }
    if (conflicts.length) {
      setReactivateConflicts(conflicts)
    }
    setSelectedIds([])
    setBulkAction(null)
  }

  async function handleReactivateWithRemoves(conflicts: { orderId: string; removeProducts: string[] }[]) {
    const ids = conflicts.map(c => c.orderId).filter(id => !pendingReactivate.current.has(id))
    if (!ids.length) return
    ids.forEach(id => pendingReactivate.current.add(id))
    setReactivateLoading(true)
    const filteredConflicts = conflicts.filter(c => ids.includes(c.orderId))
    try {
      const toDelete: string[] = []
      const toReactivate: { orderId: string; removeProducts: string[] }[] = []

      for (const { orderId, removeProducts } of filteredConflicts) {
        const conflict = reactivateConflicts.find(c => c.orderId === orderId)
        if (!conflict) continue
        if (removeProducts.length >= (conflict.totalItems ?? conflict.items.length)) {
          toDelete.push(orderId)
        } else {
          toReactivate.push({ orderId, removeProducts })
        }
      }

      if (toDelete.length > 0) {
        await deleteOrders(toDelete)
        setCancelledOrders(prev => prev.filter(o => !toDelete.includes(o._id)))
      }

      for (const { orderId, removeProducts } of toReactivate) {
        try {
          const updated = await reactivateOrder(orderId, removeProducts)
          setCancelledOrders(prev => prev.filter(o => o._id !== orderId))
          setActiveOrders(prev => {
            if (prev.find(o => o._id === orderId)) return prev
            return [updated, ...prev]
          })
        } catch (err: any) {
          const order = orders.find(o => o._id === orderId)
          if (err?.body?.outOfStock?.length && order) {
            await deleteOrders([orderId])
            setCancelledOrders(prev => prev.filter(o => o._id !== orderId))
          }
        } finally {
          pendingReactivate.current.delete(orderId)
        }
      }

      const remainingConflicts = reactivateConflicts.filter(c => !ids.includes(c.orderId))
      if (remainingConflicts.length) {
        setReactivateConflicts(remainingConflicts)
      } else {
        setReactivateConflicts([])
      }
      load()
    } finally {
      setReactivateLoading(false)
    }
  }

  async function handleSingleReactivate(order: Order) {
    if (pendingReactivate.current.has(order._id)) return
    pendingReactivate.current.add(order._id)
    try {
      const updated = await reactivateOrder(order._id)
      if (order.status === 'cancelled') {
        setCancelledOrders(prev => prev.filter(o => o._id !== order._id))
      }
      setActiveOrders(prev => {
        if (prev.find(o => o._id === order._id)) return prev
        return [updated, ...prev]
      })
      if (viewOrder?._id === order._id) setViewOrder(updated)
    } catch (err: any) {
      if (err?.body?.outOfStock?.length) {
        setReactivateConflicts([{ orderId: order._id, orderNumber: order.orderNumber, items: err.body.outOfStock, totalItems: order.items.length }])
      }
    } finally {
      pendingReactivate.current.delete(order._id)
    }
  }

  async function handleReactivateRetry() {
    const ids = reactivateConflicts.map(c => c.orderId)
    const newConflicts: ReactivateConflict[] = []
    for (const id of ids) {
      const order = orders.find(o => o._id === id)
      if (!order) continue
      try {
        const updated = await reactivateOrder(id)
        setCancelledOrders(prev => prev.filter(o => o._id !== id))
        setActiveOrders(prev => [updated, ...prev])
      } catch (err: any) {
        if (err?.body?.outOfStock?.length) {
          newConflicts.push({ orderId: id, orderNumber: order.orderNumber, items: err.body.outOfStock, totalItems: order.items.length })
        }
      }
    }
    setReactivateConflicts(newConflicts)
  }

  async function handleDeleteFromReactivate(ids: string[]) {
    try {
      await deleteOrders(ids)
      setCancelledOrders(prev => prev.filter(o => !ids.includes(o._id)))
      setReactivateConflicts([])
      load()
    } catch { /* ignore */ }
  }

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length

  const selectedOrders = useMemo(() => orders.filter(o => selectedIds.includes(o._id)), [orders, selectedIds])
  const allCancelled = selectedIds.length > 0 && selectedOrders.every(o => o.status === 'cancelled')
  const allShipped = selectedIds.length > 0 && selectedOrders.every(o => o.status === 'shipped')
  const hasNotConfirmed = selectedOrders.some(o => o.status === 'not_confirmed')
  const hasShipped = selectedOrders.some(o => o.status === 'shipped')
  const hasCancelled = selectedOrders.some(o => o.status === 'cancelled')

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    if (allSelected) setSelectedIds([])
    else setSelectedIds(filtered.map(o => o._id))
  }

  async function handleBulkDelivered() {
    const ids = selectedIds.filter(id => !pendingStatusChanges.current.has(id))
    if (!ids.length) return
    ids.forEach(id => pendingStatusChanges.current.add(id))
    for (const id of ids) {
      const order = orders.find(o => o._id === id)
      if (!order || order.status !== 'shipped') continue
      try {
        const updated = await updateOrderStatus(id, 'delivered')
        setActiveOrders(prev => prev.filter(o => o._id !== id))
        setCancelledOrders(prev => prev.filter(o => o._id !== id))
        setActiveOrders(prev => [updated, ...prev])
      } catch { /* continue */ }
    }
    ids.forEach(id => pendingStatusChanges.current.delete(id))
    setSelectedIds([])
  }

  async function bulkDelete() {
    try {
      for (const id of selectedIds) {
        const order = orders.find(o => o._id === id)
        if (order && order.status !== 'cancelled') {
          try { await restoreOrderStock(id) } catch { /* continue */ }
        }
      }
      await deleteOrders(selectedIds)
      setActiveOrders(prev => prev.filter(o => !selectedIds.includes(o._id)))
      setCancelledOrders(prev => prev.filter(o => !selectedIds.includes(o._id)))
      setSelectedIds([])
    } catch {
      load()
    }
  }

  async function handleDelete(order: Order) {
    try {
      await deleteOrders([order._id])
      setActiveOrders(prev => prev.filter(o => o._id !== order._id))
      setCancelledOrders(prev => prev.filter(o => o._id !== order._id))
      setViewOrder(null)
      setDeleteConfirm(null)
    } catch {
      load()
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Commandes</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{activeOrders.filter(o => o.status === 'not_confirmed').length} non confirmée{activeOrders.filter(o => o.status === 'not_confirmed').length !== 1 ? 's' : ''} · {activeOrders.filter(o => o.status === 'confirmed').length} confirmée{activeOrders.filter(o => o.status === 'confirmed').length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={load} className="ml-auto p-2 rounded-full text-white md:text-gray-400 bg-white/10 md:bg-transparent border border-white/15 md:border-transparent backdrop-blur-md md:backdrop-blur-none hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer" title="Actualiser">
            <HiArrowPath size={18} />
          </button>
        </div>
      </div>

      {/* Filtres */}
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
              <Select value={sort} onChange={v => setSort(v as SortKey)} options={Object.keys(sortLabels) as SortKey[]} placeholder="Trier par" formatOption={k => sortLabels[k as SortKey]} iconOnMobile />
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
                <div className="flex-1 md:w-36"><DatePicker value={filters.dateFrom} onChange={v => setFilter('dateFrom', v)} placeholder="Date début" maxDate={new Date().toISOString().split('T')[0]} rangeStart={filters.dateFrom} rangeEnd={filters.dateTo} /></div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Au</span>
                <div className="flex-1 md:w-36"><DatePicker value={filters.dateTo} onChange={v => setFilter('dateTo', v)} placeholder="Date fin" maxDate={new Date().toISOString().split('T')[0]} rangeStart={filters.dateFrom} rangeEnd={filters.dateTo} /></div>
              </div>
            </div>
          </div>
          {/* Row 3: All dropdowns */}
          <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:items-center md:gap-3 md:w-auto">
            <div className="w-full md:w-40">
              <Select value={filters.status} onChange={v => setFilter('status', v)} options={STATUS_FILTERS} placeholder="Tous statuts" formatOption={s => statusLabels[s]} />
            </div>
            <div className="w-full md:w-40">
              <Select value={filters.wilaya} onChange={v => setFilter('wilaya', v)} options={uniqueWilayas} placeholder="Toutes wilayas" />
            </div>
            <div className="w-full md:w-40">
              <Select value={filters.deliveryMethod} onChange={v => setFilter('deliveryMethod', v)} options={['home', 'stopdesk']} placeholder="Toutes livraisons" formatOption={m => m === 'home' ? 'À domicile' : 'Stop desk'} />
            </div>
            <div className="w-full md:w-40">
              <Select value={filters.deliveryCompany} onChange={v => setFilter('deliveryCompany', v)} options={uniqueCompanies.map(c => c[0])} placeholder="Tous transporteurs" formatOption={id => uniqueCompanies.find(c => c[0] === id)?.[1] || id} />
            </div>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="mb-4 flex items-center gap-1.5 flex-wrap px-4 md:px-6 lg:px-8">
          {filters.dateFrom && <Chip label={`Du ${filters.dateFrom}`} onClear={() => setFilter('dateFrom', '')} />}
          {filters.dateTo && <Chip label={`Au ${filters.dateTo}`} onClear={() => setFilter('dateTo', '')} />}
          {filters.status && <Chip label={statusLabels[filters.status]} onClear={() => setFilter('status', '')} />}
          {filters.wilaya && <Chip label={filters.wilaya} onClear={() => setFilter('wilaya', '')} />}
          {filters.deliveryMethod && <Chip label={filters.deliveryMethod === 'home' ? 'À domicile' : 'Stop desk'} onClear={() => setFilter('deliveryMethod', '')} />}
          {filters.deliveryCompany && <Chip label={uniqueCompanies.find(c => c[0] === filters.deliveryCompany)?.[1] || ''} onClear={() => setFilter('deliveryCompany', '')} />}
          <button onClick={clearFilters} className="text-[10px] font-medium text-gray-400 hover:text-primary transition-colors cursor-pointer ml-1">Tout effacer</button>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <div className="mb-3 px-4 md:px-6 lg:px-8">
          <p className="text-xs text-gray-400">{filtered.length} commande{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Aucune commande trouvée</p>
            <p className="text-xs text-gray-400">Essayez de modifier vos filtres</p>
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
              <div key={order._id} className={`transition-colors cursor-pointer ${selected ? 'bg-primary/5' : 'hover:bg-gray-50/50'}`} onClick={() => setViewOrder(order)}>
                <div className="md:hidden m-3 rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <button onClick={e => { e.stopPropagation(); toggleSelect(order._id) }} className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer shrink-0 rounded-md ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-300 hover:border-primary'}`}>
                      {selected && <HiCheck size={10} className="text-white" />}
                    </button>
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-primary">#{order.orderNumber}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                    </div>
                    <HiChevronDown size={16} className="text-gray-300 -rotate-90 shrink-0" />
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
                      <span>{order.items.length} article{order.items.length !== 1 ? 's' : ''}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
                      <span>{order.deliveryMethod === 'home' ? 'Domicile' : order.deliveryMethod === 'stopdesk' ? 'Stop desk' : 'Gratuit'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
                      <span>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total</span>
                    <span className="text-[15px] font-bold text-text tabular-nums">{Math.round(order.total)} DA</span>
                  </div>
                </div>
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                    <HiChevronDown size={16} className="text-gray-300 -rotate-90" />
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <>
          <div className="h-16" />
          <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-20 bg-white border-t border-gray-200 px-4 md:px-6 lg:px-8 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            {/* Mobile compact bar */}
            <div className="flex items-center justify-between gap-2 md:hidden">
              <span className="text-sm font-medium text-text min-w-0 truncate">
                {selectedIds.length} commande{selectedIds.length !== 1 ? 's' : ''} sélectionnée{selectedIds.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setBulkDeleteConfirm(true)} title="Supprimer" className="h-10 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-foreground transition-colors cursor-pointer flex items-center">
                  <HiTrash size={18} />
                </button>
                <button onClick={() => setActionsOpen(true)} className="h-10 px-4 rounded-lg bg-foreground text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95">
                  Actions <HiChevronDown size={14} />
                </button>
              </div>
            </div>
            {/* Desktop bar */}
            <div className="hidden md:flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-text">
                {selectedIds.length} commande{selectedIds.length !== 1 ? 's' : ''} sélectionnée{selectedIds.length !== 1 ? 's' : ''}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {allCancelled ? (
                  <>
                    <button onClick={() => setBulkAction('reactivate')} className="h-9 px-4 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center gap-1.5">
                      <HiArrowPath size={14} /> Réactiver
                    </button>
                    <button onClick={() => setBulkDeleteConfirm(true)} title="Supprimer" className="h-9 px-2 rounded-lg bg-transparent hover:bg-gray-50 text-foreground transition-colors cursor-pointer flex items-center">
                      <HiTrash size={18} />
                    </button>
                  </>
                ) : allShipped ? (
                  <>
                    <button onClick={handleBulkDelivered} className="h-9 px-4 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center gap-1.5">
                      <HiCheck size={14} /> Livrée
                    </button>
                    <button onClick={() => setBulkReturnOpen(true)} className="h-9 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                      <HiArrowUturnLeft size={14} /> Retourner
                    </button>
                    <button onClick={() => setBulkDeleteConfirm(true)} title="Supprimer" className="h-9 px-2 rounded-lg bg-transparent hover:bg-gray-50 text-foreground transition-colors cursor-pointer flex items-center">
                      <HiTrash size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    {hasNotConfirmed && (
                      <button onClick={() => setBulkAction('confirm')} className="h-9 px-4 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center gap-1.5">
                        <HiCheck size={14} /> Confirmer <span className="text-white/70">({selectedOrders.filter(o => o.status === 'not_confirmed').length})</span>
                      </button>
                    )}
                    <button onClick={() => setBulkAction('cancel')} className="h-9 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                      <HiXMark size={14} /> Annuler <span className="text-gray-400">({selectedOrders.filter(o => o.status === 'not_confirmed' || o.status === 'confirmed').length})</span>
                    </button>
                    {hasCancelled && (
                      <button onClick={() => setBulkAction('reactivate')} className="h-9 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                        <HiArrowPath size={14} className="text-blue-500" /> Réactiver <span className="text-gray-400">({selectedOrders.filter(o => o.status === 'cancelled').length})</span>
                      </button>
                    )}
                    {hasShipped && (
                      <>
                        <button onClick={handleBulkDelivered} className="h-9 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                          <HiCheck size={14} className="text-green-500" /> Livrée <span className="text-gray-400">({selectedOrders.filter(o => o.status === 'shipped').length})</span>
                        </button>
                        <button onClick={() => setBulkReturnOpen(true)} className="h-9 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                          <HiArrowUturnLeft size={14} className="text-orange-400" /> Retourner <span className="text-gray-400">({selectedOrders.filter(o => o.status === 'shipped').length})</span>
                        </button>
                      </>
                    )}
                    <button onClick={() => setBulkDeleteConfirm(true)} title="Supprimer" className="h-9 px-2 rounded-lg bg-transparent hover:bg-gray-50 text-foreground transition-colors cursor-pointer flex items-center">
                      <HiTrash size={18} />
                    </button>
                  </>
                )}
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
                  {allCancelled ? (
                    <button onClick={() => { setActionsOpen(false); setBulkAction('reactivate') }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-foreground text-white transition-transform active:scale-[0.98] cursor-pointer">
                      <HiArrowPath size={16} className="text-blue-400" />
                      <span className="text-sm font-semibold">Réactiver</span>
                    </button>
                  ) : allShipped ? (
                    <>
                      <button onClick={() => { setActionsOpen(false); handleBulkDelivered() }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-foreground text-white transition-transform active:scale-[0.98] cursor-pointer">
                        <HiCheck size={16} className="text-green-400" />
                        <span className="text-sm font-semibold">Marquer comme livrée</span>
                      </button>
                      <button onClick={() => { setActionsOpen(false); setBulkReturnOpen(true) }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                        <HiArrowUturnLeft size={16} className="text-orange-400" />
                        <span className="text-sm font-medium text-text">Retourner</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {hasNotConfirmed && (
                        <button onClick={() => { setActionsOpen(false); setBulkAction('confirm') }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-foreground text-white transition-transform active:scale-[0.98] cursor-pointer">
                          <HiCheck size={16} className="text-green-400" />
                          <span className="text-sm font-semibold">Confirmer <span className="text-white/70">({selectedOrders.filter(o => o.status === 'not_confirmed').length})</span></span>
                        </button>
                      )}
                      <button onClick={() => { setActionsOpen(false); setBulkAction('cancel') }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                        <HiXMark size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-text">Annuler <span className="text-gray-400">({selectedOrders.filter(o => o.status === 'not_confirmed' || o.status === 'confirmed').length})</span></span>
                      </button>
                      {hasCancelled && (
                        <button onClick={() => { setActionsOpen(false); setBulkAction('reactivate') }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                          <HiArrowPath size={16} className="text-blue-500" />
                          <span className="text-sm font-medium text-text">Réactiver <span className="text-gray-400">({selectedOrders.filter(o => o.status === 'cancelled').length})</span></span>
                        </button>
                      )}
                      {hasShipped && (
                        <>
                          <button onClick={() => { setActionsOpen(false); handleBulkDelivered() }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                            <HiCheck size={16} className="text-green-500" />
                            <span className="text-sm font-medium text-text">Livrée <span className="text-gray-400">({selectedOrders.filter(o => o.status === 'shipped').length})</span></span>
                          </button>
                          <button onClick={() => { setActionsOpen(false); setBulkReturnOpen(true) }} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                            <HiArrowUturnLeft size={16} className="text-orange-400" />
                            <span className="text-sm font-medium text-text">Retourner <span className="text-gray-400">({selectedOrders.filter(o => o.status === 'shipped').length})</span></span>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

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
          <div className="space-y-5">
            {/* Section: Client */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiUser size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Client</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-gray-100 sm:divide-y-0 sm:divide-x">
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

            {/* Section: Statut */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiTag size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Statut</h3>
              </div>
              <div className="p-4 space-y-3">
                {viewOrder.status === 'not_confirmed' && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <HiPhone size={18} />
                      </div>
                      <p className="text-sm font-semibold text-text">
                        Appelez le client au <a href={`tel:${viewOrder.phone}`} className="text-primary font-bold underline decoration-primary/30 underline-offset-2">{viewOrder.phone}</a> pour confirmer la commande
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4">
                      <button onClick={() => setConfirmAction({ type: 'confirm', order: viewOrder })} className="h-10 px-5 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <HiCheck size={14} /> Confirmer
                      </button>
                      <button onClick={() => setConfirmAction({ type: 'cancel', order: viewOrder })} className="h-10 px-5 rounded-lg bg-foreground/5 border border-foreground/15 text-foreground hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <HiXMark size={14} /> Annuler la commande
                      </button>
                    </div>
                  </div>
                )}

                {viewOrder.status === 'confirmed' && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <HiCheck size={16} />
                      </div>
                      <p className="text-sm font-semibold text-text">Commande confirmée</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <button onClick={() => setConfirmAction({ type: 'ship', order: viewOrder })} className="h-10 px-5 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <HiTruck size={14} /> Expédier
                      </button>
                      <button onClick={() => setConfirmAction({ type: 'cancel', order: viewOrder })} className="h-10 px-5 rounded-lg bg-foreground/5 border border-foreground/15 text-foreground hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <HiXMark size={14} /> Annuler la commande
                      </button>
                    </div>
                  </div>
                )}

                {viewOrder.status === 'shipped' && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <HiTruck size={16} />
                      </div>
                      <p className="text-sm font-semibold text-text">Commande expédiée</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <button onClick={() => setConfirmAction({ type: 'deliver', order: viewOrder })} className="h-10 px-5 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <HiCheck size={14} /> Livrée
                      </button>
                      <button onClick={() => setConfirmAction({ type: 'back', order: viewOrder })} className="h-10 px-5 rounded-lg bg-foreground/5 border border-foreground/15 text-foreground hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <HiArrowUturnLeft size={14} /> Marquer non expédiée
                      </button>
                      <button onClick={() => setShippedReturnTarget(viewOrder)} className="h-10 px-5 rounded-lg bg-foreground/5 border border-foreground/15 text-foreground hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <HiArrowUturnLeft size={14} /> Retourner
                      </button>
                    </div>
                  </div>
                )}

                {viewOrder.status === 'cancelled' && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                        <HiXMark size={16} />
                      </div>
                      <p className="text-sm font-semibold text-text">Cette commande a été annulée</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <button onClick={() => setConfirmAction({ type: 'reactivate', order: viewOrder })} className="h-10 px-5 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <HiArrowPath size={14} /> Réactiver
                      </button>
                      <button onClick={() => setDeleteConfirm(viewOrder)} className="h-10 px-5 rounded-lg bg-foreground/5 border border-foreground/15 text-foreground hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <HiTrash size={14} /> Supprimer
                      </button>
                    </div>
                  </div>
                )}

                {viewOrder.status === 'returned' && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <HiArrowUturnLeft size={16} />
                      </div>
                      <p className="text-sm font-semibold text-text">Commande retournée</p>
                    </div>
                    {viewOrder.returnReason && <p className="text-xs text-gray-500 italic mb-1">Motif : {viewOrder.returnReason}</p>}
                    <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${viewOrder.stockRestored ? 'text-green-600' : 'text-red-500'}`}>
                      {viewOrder.stockRestored ? 'Stock restitué' : 'Stock non restitué'}
                    </p>
                    <button onClick={() => setConfirmAction({ type: 'reactivate', order: viewOrder })} className="h-10 px-5 rounded-lg bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto">
                      <HiArrowPath size={14} /> Réactiver
                    </button>
                  </div>
                )}

                {(viewOrder.confirmedBy?.name || viewOrder.cancelledBy?.name) && (
                  <div className="space-y-1.5">
                    <OrderActorInfo confirmedBy={viewOrder.confirmedBy} cancelledBy={viewOrder.cancelledBy} />
                  </div>
                )}
              </div>
            </div>

            {/* Section: Livraison */}
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

            {/* Section: Note */}
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

            {/* Section: Articles */}
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
                        <img src={item.image} alt={item.name} className="w-12 h-12 sm:w-10 sm:h-10 object-contain ring-1 ring-gray-100 bg-white rounded-2xl" />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-white text-[10px] font-bold flex items-center justify-center sm:hidden">×{item.quantity}</span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gray-100 flex items-center justify-center shrink-0">
                        <HiShoppingBag size={14} className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
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

            {/* Section: Total */}
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

      <ConfirmDialog
        open={bulkDeleteConfirm}
        title="Supprimer les commandes"
        message={`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} commande${selectedIds.length !== 1 ? 's' : ''} ? Cette action est irréversible.`}
        onConfirm={() => { bulkDelete(); setBulkDeleteConfirm(false) }}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Supprimer la commande"
        message={`Êtes-vous sûr de vouloir supprimer définitivement la commande #${deleteConfirm?.orderNumber} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {confirmAction && (
        <ConfirmDialog
          open
          title={getSingleConfirmProps(confirmAction).title}
          message={getSingleConfirmProps(confirmAction).message}
          confirmLabel={getSingleConfirmProps(confirmAction).label}
          onConfirm={() => {
            const { type, order } = confirmAction
            if (type === 'confirm') handleStatusChange(order._id, 'confirmed')
            else if (type === 'ship') handleStatusChange(order._id, 'shipped')
            else if (type === 'deliver') handleStatusChange(order._id, 'delivered')
            else if (type === 'back') handleStatusChange(order._id, 'confirmed')
            else if (type === 'cancel') handleStatusChange(order._id, 'cancelled')
            else if (type === 'reactivate') handleSingleReactivate(order)
            setConfirmAction(null)
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <ConfirmDialog
        open={bulkAction === 'confirm'}
        title="Confirmer les commandes"
        message={`Voulez-vous confirmer les ${selectedOrders.filter(o => o.status === 'not_confirmed').length} commande${selectedOrders.filter(o => o.status === 'not_confirmed').length !== 1 ? 's' : ''} sélectionnée${selectedOrders.filter(o => o.status === 'not_confirmed').length !== 1 ? 's' : ''} ?`}
        confirmLabel="Confirmer"
        onConfirm={handleBulkConfirm}
        onCancel={() => setBulkAction(null)}
      />

      <ConfirmDialog
        open={bulkAction === 'cancel'}
        title="Annuler les commandes"
        message={`Voulez-vous annuler les ${selectedOrders.filter(o => o.status === 'not_confirmed' || o.status === 'confirmed').length} commande${selectedOrders.filter(o => o.status === 'not_confirmed' || o.status === 'confirmed').length !== 1 ? 's' : ''} sélectionnée${selectedOrders.filter(o => o.status === 'not_confirmed' || o.status === 'confirmed').length !== 1 ? 's' : ''} ? Les produits seront remis en stock automatiquement.`}
        confirmLabel="Confirmer"
        onConfirm={handleBulkCancel}
        onCancel={() => setBulkAction(null)}
      />

      <ConfirmDialog
        open={bulkAction === 'reactivate'}
        title="Réactiver les commandes"
        message={`Voulez-vous réactiver les ${selectedOrders.filter(o => o.status === 'cancelled').length} commande${selectedOrders.filter(o => o.status === 'cancelled').length !== 1 ? 's' : ''} sélectionnée${selectedOrders.filter(o => o.status === 'cancelled').length !== 1 ? 's' : ''} ?`}
        confirmLabel="Confirmer"
        onConfirm={handleBulkReactivate}
        onCancel={() => setBulkAction(null)}
      />

      <ReactivateDialog
        open={reactivateConflicts.length > 0}
        conflicts={reactivateConflicts}
        loading={reactivateLoading}
        onReactivate={handleReactivateWithRemoves}
        onRetry={handleReactivateRetry}
        onClose={() => setReactivateConflicts([])}
      />

      <ShippedReturnDialog
        open={shippedReturnTarget !== null || bulkReturnOpen}
        orders={bulkReturnOpen ? selectedOrders.filter(o => o.status === 'shipped') : shippedReturnTarget ? [shippedReturnTarget] : []}
        onClose={() => { setShippedReturnTarget(null); setBulkReturnOpen(false) }}
        onDone={() => {
          if (shippedReturnTarget) {
            setActiveOrders(prev => prev.filter(o => o._id !== shippedReturnTarget._id))
            setCancelledOrders(prev => prev.filter(o => o._id !== shippedReturnTarget._id))
            setViewOrder(null)
          } else {
            const shippedIds = selectedOrders.filter(o => o.status === 'shipped').map(o => o._id)
            setActiveOrders(prev => prev.filter(o => !shippedIds.includes(o._id)))
            setCancelledOrders(prev => prev.filter(o => !shippedIds.includes(o._id)))
            setSelectedIds(prev => prev.filter(id => !shippedIds.includes(id)))
          }
          setShippedReturnTarget(null)
          setBulkReturnOpen(false)
        }}
      />
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
