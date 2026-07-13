import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface SupplierRow {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  currency: string
  paymentTermDays: number
  notes: string | null
  isActive: boolean
}

export type SupplierPayload = Omit<SupplierRow, 'id' | 'isActive'>

export async function getSuppliers(search?: string): Promise<SupplierRow[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await apiFetch(`/api/suppliers${qs}`)
  if (!res.ok) throw new Error('Failed to load suppliers')
  return res.json()
}

export async function createSupplier(data: SupplierPayload): Promise<void> {
  const res = await apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create supplier')
}

export async function updateSupplier(id: string, data: SupplierPayload): Promise<void> {
  const res = await apiFetch(`/api/suppliers/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update supplier')
}

export async function toggleSupplier(id: string, activate: boolean): Promise<void> {
  const res = await apiFetch(`/api/suppliers/${id}/${activate ? 'activate' : 'deactivate'}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to update supplier status')
}
