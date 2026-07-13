import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface PropertyTypeRow {
  id: string
  name: string
  description: string | null
  maxOccupancy: number
  baseRatePerNight: number
  isActive: boolean
}

export interface PropertyRow {
  id: string
  name: string
  number: string
  floorLevel: number | null
  status: string
  propertyTypeName: string
  baseRatePerNight: number
  notes: string | null
}

export async function getPropertyTypes(): Promise<PropertyTypeRow[]> {
  const res = await apiFetch('/api/property-types')
  if (!res.ok) throw new Error('Failed to load property types')
  return res.json()
}

export async function createPropertyType(data: Omit<PropertyTypeRow, 'id' | 'isActive'>): Promise<void> {
  const res = await apiFetch('/api/property-types', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create property type')
}

export async function updatePropertyType(id: string, data: Omit<PropertyTypeRow, 'id' | 'isActive'>): Promise<void> {
  const res = await apiFetch(`/api/property-types/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update property type')
}

export async function togglePropertyType(id: string, activate: boolean): Promise<void> {
  const res = await apiFetch(`/api/property-types/${id}/${activate ? 'activate' : 'deactivate'}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle property type')
}

export async function getProperties(status?: string): Promise<PropertyRow[]> {
  const qs = status ? `?status=${status}` : ''
  const res = await apiFetch(`/api/properties${qs}`)
  if (!res.ok) throw new Error('Failed to load properties')
  return res.json()
}

export async function createProperty(data: { propertyTypeId: string; name: string; number: string; floorLevel: number | null; notes: string | null }): Promise<void> {
  const res = await apiFetch('/api/properties', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create property')
}

export async function updateProperty(id: string, data: { propertyTypeId: string; name: string; number: string; floorLevel: number | null; notes: string | null }): Promise<void> {
  const res = await apiFetch(`/api/properties/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update property')
}

export async function updatePropertyStatus(id: string, status: string): Promise<void> {
  const res = await apiFetch(`/api/properties/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) })
  if (!res.ok) throw new Error('Failed to update property status')
}
