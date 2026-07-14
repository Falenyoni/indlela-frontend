import { apiFetch } from '@/shared/lib/api/apiFetch'

// Vehicles
export interface VehicleRow {
  id: string
  registration: string
  make: string
  model: string
  vehicleType: string
  capacity: number
  isActive: boolean
}

export type VehiclePayload = Omit<VehicleRow, 'id' | 'isActive'>

export async function getVehicles(search?: string): Promise<VehicleRow[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await apiFetch(`/api/vehicles${qs}`)
  if (!res.ok) throw new Error('Failed to load vehicles')
  return res.json()
}

export async function createVehicle(data: VehiclePayload): Promise<string> {
  const res = await apiFetch('/api/vehicles', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create vehicle')
  return res.json()
}

export async function updateVehicle(id: string, data: VehiclePayload): Promise<void> {
  const res = await apiFetch(`/api/vehicles/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update vehicle')
}

export async function toggleVehicle(id: string): Promise<void> {
  const res = await apiFetch(`/api/vehicles/${id}/toggle`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle vehicle')
}

// Drivers
export interface DriverRow {
  id: string
  fullName: string
  licenseNumber: string
  phone: string | null
  isActive: boolean
}

export type DriverPayload = Omit<DriverRow, 'id' | 'isActive'>

export async function getDrivers(search?: string): Promise<DriverRow[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await apiFetch(`/api/drivers${qs}`)
  if (!res.ok) throw new Error('Failed to load drivers')
  return res.json()
}

export async function createDriver(data: DriverPayload): Promise<string> {
  const res = await apiFetch('/api/drivers', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create driver')
  return res.json()
}

export async function updateDriver(id: string, data: DriverPayload): Promise<void> {
  const res = await apiFetch(`/api/drivers/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update driver')
}

export async function toggleDriver(id: string): Promise<void> {
  const res = await apiFetch(`/api/drivers/${id}/toggle`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle driver')
}

// Vehicle Types
export interface VehicleTypeRow {
  id: string
  name: string
  isActive: boolean
}

export async function getVehicleTypes(activeOnly = false): Promise<VehicleTypeRow[]> {
  const res = await apiFetch(`/api/vehicle-types${activeOnly ? '?activeOnly=true' : ''}`)
  if (!res.ok) throw new Error('Failed to load vehicle types')
  return res.json()
}

export async function createVehicleType(name: string): Promise<string> {
  const res = await apiFetch('/api/vehicle-types', { method: 'POST', body: JSON.stringify({ name }) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? 'Failed to create vehicle type')
  }
  return res.json()
}

export async function toggleVehicleType(id: string): Promise<void> {
  const res = await apiFetch(`/api/vehicle-types/${id}/toggle`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle vehicle type')
}

// Vehicle Makes
export interface VehicleMakeRow {
  id: string
  name: string
  isActive: boolean
}

export async function getVehicleMakes(activeOnly = false): Promise<VehicleMakeRow[]> {
  const res = await apiFetch(`/api/vehicle-makes${activeOnly ? '?activeOnly=true' : ''}`)
  if (!res.ok) throw new Error('Failed to load vehicle makes')
  return res.json()
}

export async function createVehicleMake(name: string): Promise<string> {
  const res = await apiFetch('/api/vehicle-makes', { method: 'POST', body: JSON.stringify({ name }) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? 'Failed to create make')
  }
  return res.json()
}

export async function toggleVehicleMake(id: string): Promise<void> {
  const res = await apiFetch(`/api/vehicle-makes/${id}/toggle`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle make')
}

// Vehicle Models
export interface VehicleModelRow {
  id: string
  makeId: string
  makeName: string
  name: string
  isActive: boolean
}

export async function getVehicleModels(makeId?: string, activeOnly = false): Promise<VehicleModelRow[]> {
  const params = new URLSearchParams()
  if (makeId) params.set('makeId', makeId)
  if (activeOnly) params.set('activeOnly', 'true')
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await apiFetch(`/api/vehicle-models${qs}`)
  if (!res.ok) throw new Error('Failed to load vehicle models')
  return res.json()
}

export async function createVehicleModel(makeId: string, name: string): Promise<string> {
  const res = await apiFetch('/api/vehicle-models', { method: 'POST', body: JSON.stringify({ makeId, name }) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? 'Failed to create model')
  }
  return res.json()
}

export async function toggleVehicleModel(id: string): Promise<void> {
  const res = await apiFetch(`/api/vehicle-models/${id}/toggle`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle model')
}

// Transfer Requests
export interface TransferRequestRow {
  id: string
  bookingId: string
  reservationNumber: string
  guestName: string
  description: string
  pickupTime: string
  pax: number
  vehicleId: string | null
  driverId: string | null
  driverName: string | null
  isSubcontracted: boolean
  subcontractorName: string | null
  status: string
  notes: string | null
}

export interface AssignPayload {
  vehicleId?: string
  driverId?: string
  isSubcontracted: boolean
  subcontractorName?: string
}

export async function getTransferRequests(status?: string, date?: string): Promise<TransferRequestRow[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (date) params.set('date', date)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await apiFetch(`/api/transfer-requests${qs}`)
  if (!res.ok) throw new Error('Failed to load transfer requests')
  return res.json()
}

export async function assignTransferRequest(id: string, data: AssignPayload): Promise<void> {
  const res = await apiFetch(`/api/transfer-requests/${id}/assign`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to assign transfer request')
}
