import { apiFetch } from '@/shared/lib/api/apiFetch'

export const LOCATION_TYPES = ['Airport', 'Hotel', 'Lodge', 'Camp', 'Harbour', 'Border', 'CityCenter', 'Other'] as const
export type LocationType = typeof LOCATION_TYPES[number]

export interface LocationRow {
  id: string
  name: string
  type: string
  region: string | null
  notes: string | null
  isActive: boolean
}

export type LocationPayload = { name: string; type: string; region: string | null; notes: string | null }

export async function getLocations(search?: string, type?: string, region?: string): Promise<LocationRow[]> {
  const qs = new URLSearchParams()
  if (search) qs.set('search', search)
  if (type) qs.set('type', type)
  if (region) qs.set('region', region)
  const res = await apiFetch(`/api/locations?${qs}`)
  if (!res.ok) throw new Error('Failed to load locations')
  return res.json()
}

export async function createLocation(data: LocationPayload): Promise<void> {
  const res = await apiFetch('/api/locations', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create location')
}

export async function updateLocation(id: string, data: LocationPayload): Promise<void> {
  const res = await apiFetch(`/api/locations/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update location')
}

export async function toggleLocation(id: string, activate: boolean): Promise<void> {
  const res = await apiFetch(`/api/locations/${id}/${activate ? 'activate' : 'deactivate'}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to update location status')
}
