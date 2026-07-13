import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface TransferRouteRow {
  id: string
  pickupLocationId: string | null
  pickupLocationName: string
  dropoffLocationId: string | null
  dropoffLocationName: string
  vehicleType: string
  maxPassengers: number
  rackRate: number
  costRate: number
  notes: string | null
  isActive: boolean
}

export type TransferRoutePayload = Omit<TransferRouteRow, 'id' | 'isActive'>

export async function getTransferRoutes(search?: string): Promise<TransferRouteRow[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await apiFetch(`/api/transfer-routes${qs}`)
  if (!res.ok) throw new Error('Failed to load transfer routes')
  return res.json()
}

export async function createTransferRoute(data: TransferRoutePayload): Promise<string> {
  const res = await apiFetch('/api/transfer-routes', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create transfer route')
  return res.json()
}

export async function updateTransferRoute(id: string, data: TransferRoutePayload): Promise<void> {
  const res = await apiFetch(`/api/transfer-routes/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update transfer route')
}

export async function toggleTransferRoute(id: string, activate: boolean): Promise<void> {
  const action = activate ? 'activate' : 'deactivate'
  const res = await apiFetch(`/api/transfer-routes/${id}/${action}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to update transfer route status')
}
