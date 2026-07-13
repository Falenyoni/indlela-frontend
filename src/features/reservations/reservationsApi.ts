import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface ReservationRow {
  id: string
  reservationNumber: string
  guestName: string
  propertyName: string
  checkInDate: string
  checkOutDate: string
  adults: number
  children: number
  totalNights: number
  totalAmount: number
  status: string
  createdAt: string
}

export interface ReservationDetail extends ReservationRow {
  guestId: string
  propertyId: string
  ratePerNight: number
  notes: string | null
}

export interface CreateReservationRequest {
  guestId: string
  guestName: string
  propertyId: string
  propertyName: string
  checkInDate: string
  checkOutDate: string
  adults: number
  children: number
  ratePerNight: number
  notes: string | null
}

export async function getReservations(status?: string): Promise<ReservationRow[]> {
  const qs = status ? `?status=${status}` : ''
  const res = await apiFetch(`/api/reservations${qs}`)
  if (!res.ok) throw new Error('Failed to load reservations')
  return res.json()
}

export async function getReservationById(id: string): Promise<ReservationDetail> {
  const res = await apiFetch(`/api/reservations/${id}`)
  if (!res.ok) throw new Error('Reservation not found')
  return res.json()
}

export async function createReservation(data: CreateReservationRequest): Promise<string> {
  const res = await apiFetch('/api/reservations', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create reservation')
  const body = await res.json()
  return body.reservationNumber
}

export async function confirmReservation(id: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to confirm reservation')
}

export async function checkInReservation(id: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/${id}/check-in`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to check in')
}

export async function checkOutReservation(id: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/${id}/check-out`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to check out')
}

export async function cancelReservation(id: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/${id}/cancel`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to cancel reservation')
}
