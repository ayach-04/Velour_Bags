import { api, authApi } from './index'

export interface OrderItem {
  product: string
  name: string
  price: number
  quantity: number
  image: string
  volume?: string
  color?: string
  colorImage?: string
  costPrice?: number
}

export interface OrderHistoryEntry {
  status: string
  byType: 'admin' | 'worker'
  byId?: string
  byName?: string
  at: string
}

export interface ConfirmedBy {
  id?: string
  type?: 'admin' | 'worker'
  name?: string
  at?: string
}

export interface Order {
  _id: string
  orderNumber: number
  firstName: string
  lastName: string
  phone: string
  wilaya: string
  commune: string
  address: string
  orderNote?: string
  items: OrderItem[]
  subtotal: number
  deliveryCompany?: { _id: string; name: string; abbreviation?: string; returnPrice?: number | null }
  deliveryMethod: 'home' | 'stopdesk' | null
  deliveryCost: number
  total: number
  status: 'not_confirmed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'archived' | 'returned'
  returnReason?: string
  stockRestored: boolean
  archived?: boolean
  deliveredAt?: string
  returnedAt?: string
  archivedAt?: string
  history?: OrderHistoryEntry[]
  confirmedBy?: ConfirmedBy | null
  cancelledBy?: ConfirmedBy | null
  assignedTo?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateOrderInput {
  firstName: string
  lastName: string
  phone: string
  wilaya: string
  commune: string
  address: string
  orderNote?: string
  items: OrderItem[]
  subtotal: number
  deliveryCompany?: string
  deliveryMethod: 'home' | 'stopdesk' | null
  deliveryCost: number
  total: number
}

export async function createOrder(data: CreateOrderInput): Promise<Order> {
  return api<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchActiveOrders(): Promise<Order[]> {
  return authApi<Order[]>('/api/orders/active')
}

export async function fetchCancelledOrders(): Promise<Order[]> {
  return authApi<Order[]>('/api/orders/cancelled')
}

export async function fetchOrder(id: string): Promise<Order> {
  return authApi<Order>(`/api/orders/${id}`)
}

export async function updateOrderStatus(id: string, status: string): Promise<Order> {
  return authApi<Order>(`/api/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function updateOrderClientInfo(id: string, data: { firstName: string; lastName: string; phone: string; wilaya: string; commune: string; address: string }): Promise<Order> {
  return authApi<Order>(`/api/orders/${id}/client`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export interface UpdateOrderInput {
  firstName: string
  lastName: string
  phone: string
  wilaya: string
  commune: string
  address: string
  items: OrderItem[]
  subtotal: number
  deliveryCompany?: string | null
  deliveryMethod: 'home' | 'stopdesk' | null
  deliveryCost: number
  total: number
}

export async function updateOrder(id: string, data: UpdateOrderInput): Promise<Order> {
  return authApi<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export interface OutOfStockItem {
  product: string
  name: string
  image?: string
  available: number
  needed: number
}

export interface ReactivateConflict {
  error: string
  outOfStock: OutOfStockItem[]
}

export async function reactivateOrder(id: string, removeProducts?: string[]): Promise<Order> {
  return authApi<Order>(`/api/orders/${id}/reactivate`, {
    method: 'PATCH',
    body: JSON.stringify({ removeProducts }),
  })
}

export async function deleteOrders(ids: string[]): Promise<{ deleted: number }> {
  return authApi<{ deleted: number }>('/api/orders', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  })
}

export interface OrderStats {
  summary: {
    totalOrders: number
    totalRevenue: number
    avgOrderValue: number
    deliveredCount: number
    deliveredTotal: number
    returnedCount: number
    cancelledCount: number
    shippedCount: number
    shippingRate: number
    returnRate: number
    cancellationRate: number
    avgOrdersPerDay: number
  }
  statusBreakdown: { _id: string; count: number }[]
  ordersOverTime: { _id: string; count: number; revenue: number }[]
  revenueOverTime: { _id: string; net: number; fees: number; count: number }[]
  topWilayas: { _id: string; delivered: number; returned: number }[]
  deliverySplit: { _id: string | null; count: number; revenue: number }[]
  topProducts: { _id: string; totalQty: number; revenue: number; image: string; orders: number }[]
}

export async function fetchOrderStats(days?: number): Promise<OrderStats> {
  const qs = days ? `?days=${days}` : ''
  return authApi<OrderStats>(`/api/orders/stats${qs}`)
}

export interface MonthlyStats {
  month: string
  productsListed: number
  productsAdded: number
  orders: number
  revenue: number
  avgOrderValue: number
  netProfit: number
  returnLosses: number
  returnedCount: number
  cancelledCount: number
  deliveredCount: number
  confirmedCount: number
  shippedCount: number
  notConfirmedCount: number
  soldQuantity: number
}

export async function fetchMonthlyStats(): Promise<MonthlyStats> {
  return authApi<MonthlyStats>('/api/orders/monthly')
}

export interface ArchiveResponse {
  orders: Order[]
  total: number
  page: number
  pages: number
  years?: number[]
}

export async function fetchArchivedOrders(params: {
  page?: number
  limit?: number
  from?: string
  to?: string
  search?: string
  status?: string
  wilaya?: string
  deliveryCompany?: string
  deliveryMethod?: string
  year?: string
  sort?: string
}): Promise<ArchiveResponse> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  if (params.wilaya) qs.set('wilaya', params.wilaya)
  if (params.deliveryCompany) qs.set('deliveryCompany', params.deliveryCompany)
  if (params.deliveryMethod) qs.set('deliveryMethod', params.deliveryMethod)
  if (params.year) qs.set('year', params.year)
  if (params.sort) qs.set('sort', params.sort)
  return authApi<ArchiveResponse>(`/api/orders/archive?${qs.toString()}`)
}

export async function restoreOrder(id: string): Promise<Order> {
  return authApi<Order>(`/api/orders/${id}/restore`, {
    method: 'PATCH',
  })
}

export async function fetchConfirmedOrders(): Promise<Order[]> {
  return authApi<Order[]>('/api/orders/confirmed')
}

export async function fetchReturnedOrders(): Promise<Order[]> {
  return authApi<Order[]>('/api/orders/returned')
}

export async function fetchShippedOrders(): Promise<Order[]> {
  return authApi<Order[]>('/api/orders/shipped')
}

export async function fetchDeliveredOrders(): Promise<Order[]> {
  return authApi<Order[]>('/api/orders/delivered')
}

export interface ArchiveOrdersResponse {
  archived: number
  archivedAt: string
}

export async function archiveOrders(ids: string[]): Promise<ArchiveOrdersResponse> {
  return authApi<ArchiveOrdersResponse>('/api/orders/archive', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function returnOrder(id: string, data: { restoreItems?: string[]; reason?: string }): Promise<Order> {
  return authApi<Order>(`/api/orders/${id}/return`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function restoreOrderStock(id: string): Promise<Order> {
  return authApi<Order>(`/api/orders/${id}/restore-stock`, {
    method: 'PATCH',
  })
}

export interface DashboardData {
  today: {
    orders: number
    revenue: number
    avgOrderValue: number
  }
  yesterday: {
    orders: number
    revenue: number
  }
  statusCounts: {
    not_confirmed: number
    confirmed: number
    shipped: number
    delivered: number
    cancelled: number
    returned: number
    archived: number
  }
  totalOrders: number
  stock: {
    total: number
    outOfStock: number
    lowStock: number
  }
  lowStockProducts: {
    _id: string
    name: string
    image?: string
    stock?: number
    category?: string
    label?: string
  }[]
  recentOrders: Order[]
  workers: { total: number; active: number }
  workerStats: {
    _id: string
    name: string
    active: boolean
    frequency: number
    image?: string
    assigned: number
    confirmed: number
    cancelled: number
    todayConfirmed: number
    queue: number
    rate: number
  }[]
  hourlyActivity: { hour: number; count: number }[]
  stockVelocity: {
    _id: string
    name: string
    image?: string
    stock: number
    velocity: number
    daysLeft: number | null
  }[]
  monthlyTopProducts: {
    _id: string
    name: string
    image?: string
    category?: string
    orders: number
    confirmed: number
    soldQty: number
  }[]
}

export async function fetchDashboard(): Promise<DashboardData> {
  return authApi<DashboardData>('/api/orders/dashboard')
}
