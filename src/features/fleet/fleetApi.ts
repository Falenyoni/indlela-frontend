import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface VehicleServiceStatus {
  vehicleId: string
  currentOdometer: number
  lastServiceOdometer: number
  serviceIntervalKm: number
  kmSinceService: number
  lastServiceDate: string | null
  status: 'Ok' | 'DueSoon' | 'Overdue'
}

export interface OdometerReadingDto {
  id: string
  readingKm: number
  readingDate: string
  notes: string | null
  submittedByUserId: string
  createdAt: string
}

export async function getFleetServiceStatus(): Promise<VehicleServiceStatus[]> {
  const res = await apiFetch('/api/fleet/service-status')
  if (!res.ok) throw new Error('Failed to load fleet service status')
  return res.json()
}

export async function getOdometerHistory(vehicleId: string, limit = 10): Promise<OdometerReadingDto[]> {
  const res = await apiFetch(`/api/fleet/vehicles/${vehicleId}/odometer?limit=${limit}`)
  if (!res.ok) throw new Error('Failed to load odometer history')
  return res.json()
}

export async function logOdometerReading(vehicleId: string, data: {
  readingKm: number
  readingDate: string
  notes?: string | null
}): Promise<string> {
  const res = await apiFetch(`/api/fleet/vehicles/${vehicleId}/odometer`, {
    method: 'POST',
    body: JSON.stringify({ ...data, vehicleId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string; message?: string }).detail ?? (err as { detail?: string; message?: string }).message ?? 'Failed to log reading')
  }
  return res.json()
}

export async function recordService(vehicleId: string): Promise<void> {
  const res = await apiFetch(`/api/fleet/vehicles/${vehicleId}/service`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string; message?: string }).detail ?? (err as { detail?: string; message?: string }).message ?? 'Failed to record service')
  }
}

export interface OdometerReadingReportDto {
  vehicleId: string
  readingKm: number
  readingDate: string
}

export async function getAllOdometerReadings(params: {
  from?: string
  to?: string
  vehicleId?: string
} = {}): Promise<OdometerReadingReportDto[]> {
  const sp = new URLSearchParams()
  if (params.from)      sp.set('from', params.from)
  if (params.to)        sp.set('to', params.to)
  if (params.vehicleId) sp.set('vehicleId', params.vehicleId)
  const res = await apiFetch(`/api/fleet/odometer-readings?${sp}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string; message?: string }
    throw new Error(err.detail ?? err.message ?? 'Failed to load fleet readings')
  }
  return res.json()
}

export async function updateServiceConfig(vehicleId: string, serviceIntervalKm: number): Promise<void> {
  const res = await apiFetch(`/api/fleet/vehicles/${vehicleId}/config`, {
    method: 'PUT',
    body: JSON.stringify({ vehicleId, serviceIntervalKm }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string; message?: string }).detail ?? (err as { detail?: string; message?: string }).message ?? 'Failed to update config')
  }
}
