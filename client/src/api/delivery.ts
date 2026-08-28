import { api, authApi } from './index'

interface WilayaRef {
  _id: string
  code: string
  name: string
}

interface PriceEntry {
  wilaya: WilayaRef
  homeDelivery: number | null
  stopDesk: number | null
  returnFee?: number | null
}

export interface DeliveryCompany {
  _id: string
  name: string
  logo?: string
  location: string
  notes?: string
  abbreviation?: string
  isActive: boolean
  isDefault: boolean
  returnPrice?: number | null
  prices: PriceEntry[]
}

export interface PriceInput {
  wilayaCode: string
  homeDelivery: number | null
  stopDesk: number | null
  returnFee?: number | null
}

export async function fetchDeliveryCompanies(): Promise<DeliveryCompany[]> {
  return api<DeliveryCompany[]>('/api/delivery')
}

export async function fetchDeliveryCompany(id: string): Promise<DeliveryCompany> {
  return api<DeliveryCompany>(`/api/delivery/${id}`)
}

export async function createDeliveryCompany(data: { name: string; logo?: string; location: string; notes?: string; abbreviation?: string; isActive?: boolean; prices?: PriceInput[] }): Promise<DeliveryCompany> {
  return authApi<DeliveryCompany>('/api/delivery', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDeliveryCompany(id: string, data: Partial<{ name: string; logo?: string; location: string; notes?: string; abbreviation?: string; isActive: boolean; prices: PriceInput[] }>): Promise<DeliveryCompany> {
  return authApi<DeliveryCompany>(`/api/delivery/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteDeliveryCompany(id: string): Promise<void> {
  await authApi(`/api/delivery/${id}`, { method: 'DELETE' })
}

export async function importDeliveryPrices(companyId: string, prices: PriceInput[]): Promise<DeliveryCompany> {
  return authApi<DeliveryCompany>('/api/delivery/import', {
    method: 'POST',
    body: JSON.stringify({ companyId, prices }),
  })
}

export async function setDefaultDeliveryCompany(id: string): Promise<void> {
  await authApi(`/api/delivery/${id}/default`, { method: 'PATCH' })
}
