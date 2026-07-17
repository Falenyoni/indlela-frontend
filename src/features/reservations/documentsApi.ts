import { apiFetch } from '@/shared/lib/api/apiFetch'
import { apiUpload } from '@/shared/lib/api/apiUpload'

export type DocumentDto = {
  id: string
  reservationId: string
  fileName: string
  contentType: string
  fileSizeBytes: number
  uploadedByName: string
  createdAt: string
}

export async function getDocuments(bookingId: string): Promise<DocumentDto[]> {
  const res = await apiFetch(`/api/reservations/${bookingId}/documents`)
  if (!res.ok) throw new Error('Failed to load documents')
  return res.json()
}

export async function uploadDocument(bookingId: string, file: File): Promise<{ id: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiUpload(`/api/reservations/${bookingId}/documents`, form)
  if (!res.ok) {
    const err = await res.text().catch(() => 'Upload failed')
    throw new Error(err)
  }
  return res.json()
}

export function downloadDocumentUrl(bookingId: string, docId: string): string {
  return `${import.meta.env.VITE_API_BASE_URL}/api/reservations/${bookingId}/documents/${docId}/download`
}

export async function deleteDocument(bookingId: string, docId: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/${bookingId}/documents/${docId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete document')
}
