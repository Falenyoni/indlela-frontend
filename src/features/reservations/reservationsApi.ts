import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface BookingRow {
  id: string
  reservationNumber: string
  guestId: string
  guestName: string
  agentName: string | null
  consultantName: string
  baseLocationName: string | null
  travelStartDate: string
  travelEndDate: string
  pax: number
  currency: string
  totalAmount: number
  status: string
  bookingSource: string
  createdAt: string
}

export interface LineItemDto {
  id: string
  productType: string
  productId: string | null
  description: string
  quantity: number
  unit: string
  rackRate: number
  agentDiscountPercent: number
  reservationistDiscountPercent: number
  sellingRate: number
  sellingTotal: number
  costRate: number
  costTotal: number
  childQuantity: number
  childRackRate: number
  childSellingRate: number
  childSellingTotal: number
  childCostRate: number
  childCostTotal: number
}

export interface BookingDetail {
  id: string
  reservationNumber: string
  guestId: string
  guestName: string
  agentId: string | null
  agentName: string | null
  consultantName: string
  baseLocationId: string | null
  baseLocationName: string | null
  travelStartDate: string
  travelEndDate: string
  pax: number
  currency: string
  exchangeRate: number
  reservationistDiscountPercent: number
  totalAmount: number
  status: string
  notes: string | null
  createdAt: string
  lineItems: LineItemDto[]
}

export interface CreateBookingRequest {
  guestId: string
  guestName: string
  agentId: string | null
  agentName: string | null
  consultantName: string
  baseLocationId: string | null
  baseLocationName: string | null
  travelStartDate: string
  travelEndDate: string
  pax: number
  currency: string
  exchangeRate: number
  reservationistDiscountPercent: number
  notes: string | null
  bookingSource: string
}

export interface ConsultantOption {
  id: string
  fullName: string
}

export async function getConsultants(): Promise<ConsultantOption[]> {
  const res = await apiFetch('/api/consultants')
  if (!res.ok) throw new Error('Failed to load consultants')
  return res.json()
}

export interface AddLineItemRequest {
  productType: string
  productId: string | null
  description: string
  quantity: number
  unit: string
  rackRate: number
  agentDiscountPercent: number
  reservationistDiscountPercent: number
  costRate: number
  childQuantity: number
  childRackRate: number
  childCostRate: number
}

export async function getReservations(status?: string, guestId?: string): Promise<BookingRow[]> {
  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  if (guestId) qs.set('guestId', guestId)
  const res = await apiFetch(`/api/reservations?${qs}`)
  if (!res.ok) throw new Error('Failed to load bookings')
  return res.json()
}

export async function getReservationById(id: string): Promise<BookingDetail> {
  const res = await apiFetch(`/api/reservations/${id}`)
  if (!res.ok) throw new Error('Booking not found')
  return res.json()
}

export async function createReservation(data: CreateBookingRequest): Promise<{ reservationNumber: string }> {
  const res = await apiFetch('/api/reservations', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? 'Failed to create booking')
  }
  return res.json()
}

export async function addLineItem(bookingId: string, data: AddLineItemRequest): Promise<{ id: string }> {
  const res = await apiFetch(`/api/reservations/${bookingId}/line-items`, {
    method: 'POST',
    body: JSON.stringify({ ...data, bookingId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? 'Failed to add line item')
  }
  return res.json()
}

export async function removeLineItem(bookingId: string, itemId: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/${bookingId}/line-items/${itemId}/remove`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to remove line item')
}

export async function quoteReservation(id: string): Promise<void> {
  await apiFetch(`/api/reservations/${id}/quote`, { method: 'POST' })
}

export async function confirmReservation(id: string): Promise<void> {
  await apiFetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
}

export async function startTrip(id: string): Promise<void> {
  await apiFetch(`/api/reservations/${id}/start`, { method: 'POST' })
}

export async function completeTrip(id: string): Promise<void> {
  await apiFetch(`/api/reservations/${id}/complete`, { method: 'POST' })
}

export async function cancelReservation(id: string): Promise<void> {
  await apiFetch(`/api/reservations/${id}/cancel`, { method: 'POST' })
}

// Keep old type alias so imports elsewhere don't break immediately
export type ReservationRow = BookingRow
export type CreateReservationRequest = CreateBookingRequest
