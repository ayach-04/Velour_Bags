import { authApi, workerApi } from './index'
import type { Order, OrderItem } from './orders'

export interface WorkerStats {
  totalOrders: number
  confirmedOrders: number
  canceledOrders: number
  rate: number
}

export interface Worker {
  _id: string
  name: string
  email: string
  username?: string
  phone?: string
  image?: string
  active: boolean
  frequency?: number
  createdAt: string
  stats?: WorkerStats
}

export interface WorkerInput {
  name: string
  email: string
  password?: string
  phone?: string
  username?: string
  active?: boolean
  frequency?: number
}

export async function createWorker(data: WorkerInput): Promise<{ worker: Worker }> {
  return authApi<{ worker: Worker }>('/api/workers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function listWorkers(): Promise<{ workers: Worker[] }> {
  return authApi<{ workers: Worker[] }>('/api/workers')
}

export async function updateWorker(id: string, data: Partial<WorkerInput>): Promise<{ worker: Worker }> {
  return authApi<{ worker: Worker }>(`/api/workers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function fetchWorkerMe(): Promise<{ worker: Worker }> {
  return workerApi<{ worker: Worker }>('/api/workers/me')
}

export async function updateWorkerProfile(data: { name: string; email: string; image?: string }): Promise<{ worker: Worker }> {
  return workerApi<{ worker: Worker }>('/api/workers/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function changeWorkerPassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
  return workerApi<{ message: string }>('/api/workers/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export interface WorkerPerformance {
  totalConfirmed: number
  totalRevenue: number
  deliveredCount: number
  deliveredTotal: number
  returnedCount: number
  cancelledCount: number
  cancelledByWorker: number
  todayConfirmed: number
}

export async function fetchWorkerPerformance(): Promise<{ performance: WorkerPerformance }> {
  return workerApi<{ performance: WorkerPerformance }>('/api/workers/performance')
}

export async function fetchWorkerOrders(): Promise<{ orders: Order[] }> {
  return workerApi<{ orders: Order[] }>('/api/workers/orders')
}

export async function confirmOrder(id: string): Promise<Order> {
  return workerApi<Order>(`/api/workers/orders/${id}/confirm`, {
    method: 'PATCH',
  })
}

export async function cancelOrder(id: string): Promise<Order> {
  return workerApi<Order>(`/api/workers/orders/${id}/cancel`, {
    method: 'PATCH',
  })
}

export interface WorkerOrderUpdateInput {
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

export async function updateWorkerOrder(id: string, data: WorkerOrderUpdateInput): Promise<Order> {
  return workerApi<Order>(`/api/workers/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function runDispatch(): Promise<{ assigned: number }> {
  return authApi<{ assigned: number }>('/api/workers/dispatch/run', {
    method: 'POST',
  })
}
