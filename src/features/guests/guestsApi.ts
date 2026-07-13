import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface GuestRow {
  id: string
  fullName: string
  documentNumber: string
  dateOfBirth: string
  gender: string
  status: string
  nationality: string | null
  createdAt: string
}

export interface RegisterGuestRequest {
  firstName: string
  lastName: string
  middleName: string | null
  dateOfBirth: string
  gender: string
  documentType: string
  documentNumber: string
  nationality: string | null
  contacts: { type: string; phoneNumber: string; email: string | null; isPrimary: boolean }[]
  addresses: null
}

export async function getGuests(searchTerm?: string): Promise<GuestRow[]> {
  const qs = new URLSearchParams({ pageSize: '200' })
  if (searchTerm) qs.set('searchTerm', searchTerm)
  const res = await apiFetch(`/api/guests?${qs}`)
  if (!res.ok) throw new Error('Failed to load guests')
  const paged = await res.json()
  return paged.data
}

export interface GuestDetail {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  dateOfBirth: string
  gender: string
  documentType: string
  documentNumber: string
  nationality: string | null
  notes: string | null
  status: string
  contacts: { id: string; type: string; phoneNumber: string; email: string | null; isPrimary: boolean }[]
}

export async function getGuestById(id: string): Promise<GuestDetail> {
  const res = await apiFetch(`/api/guests/${id}`)
  if (!res.ok) throw new Error('Guest not found')
  return res.json()
}

export async function updateGuest(id: string, data: { firstName: string; lastName: string; middleName: string | null; nationality: string | null; notes: string | null }): Promise<void> {
  const res = await apiFetch(`/api/guests/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update guest')
}

export async function registerGuest(data: RegisterGuestRequest): Promise<GuestRow> {
  const res = await apiFetch('/api/guests', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? 'Failed to register guest')
  }
  return res.json()
}
