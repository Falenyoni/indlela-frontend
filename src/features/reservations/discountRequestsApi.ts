import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface DiscountRequestRow {
  id: string
  bookingId: string
  reservationNumber: string
  lineItemId: string | null
  requestedDiscountPercent: number
  reason: string
  status: string
  requestedByName: string
  createdAt: string
  reviewedByName: string | null
  reviewNote: string | null
  reviewedAt: string | null
}

export async function getDiscountRequests(status?: string): Promise<DiscountRequestRow[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  const res = await apiFetch(`/api/discount-requests${qs}`)
  if (!res.ok) throw new Error('Failed to load discount requests')
  return res.json()
}

export async function createDiscountRequest(data: {
  bookingId: string
  reservationNumber: string
  lineItemId?: string
  requestedDiscountPercent: number
  reason: string
}): Promise<string> {
  const res = await apiFetch('/api/discount-requests', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create discount request')
  return res.json()
}

export async function reviewDiscountRequest(id: string, approved: boolean, note?: string): Promise<void> {
  const res = await apiFetch(`/api/discount-requests/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ approved, note: note ?? null }),
  })
  if (!res.ok) throw new Error('Failed to review discount request')
}
