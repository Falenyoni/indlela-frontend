import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface ActivityRow {
  id: string
  name: string
  description: string | null
  category: string
  pricePerPerson: number
  childPricePerPerson: number | null
  durationMinutes: number
  maxParticipants: number | null
  isActive: boolean
}

export interface ItineraryItemResponse {
  id: string
  activityId: string
  activityName: string
  scheduledAt: string
  participantCount: number
  pricePerPerson: number
  totalPrice: number
  notes: string | null
  status: string
}

export interface ItineraryResponse {
  id: string
  reservationId: string
  title: string
  notes: string | null
  items: ItineraryItemResponse[]
}

export async function getActivities(category?: string): Promise<ActivityRow[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : ''
  const res = await apiFetch(`/api/activities${qs}`)
  if (!res.ok) throw new Error('Failed to load activities')
  return res.json()
}

export async function createActivity(data: Omit<ActivityRow, 'id' | 'isActive'>): Promise<void> {
  const res = await apiFetch('/api/activities', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create activity')
}

export async function updateActivity(id: string, data: Omit<ActivityRow, 'id' | 'isActive'>): Promise<void> {
  const res = await apiFetch(`/api/activities/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update activity')
}

export async function toggleActivity(id: string, activate: boolean): Promise<void> {
  const res = await apiFetch(`/api/activities/${id}/${activate ? 'activate' : 'deactivate'}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle activity')
}

export async function getItinerary(reservationId: string): Promise<ItineraryResponse | null> {
  const res = await apiFetch(`/api/reservations/${reservationId}/itinerary`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to load itinerary')
  return res.json()
}

export async function createItinerary(reservationId: string, title: string, notes: string | null): Promise<void> {
  const res = await apiFetch(`/api/reservations/${reservationId}/itinerary`, { method: 'POST', body: JSON.stringify({ title, notes }) })
  if (!res.ok) throw new Error('Failed to create itinerary')
}

export async function addItineraryItem(reservationId: string, data: { activityId: string; scheduledAt: string; participantCount: number; notes: string | null }): Promise<void> {
  const res = await apiFetch(`/api/reservations/${reservationId}/itinerary/items`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to add itinerary item')
}

export async function removeItineraryItem(reservationId: string, itemId: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/${reservationId}/itinerary/items/${itemId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove itinerary item')
}
