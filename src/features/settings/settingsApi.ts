import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface UserRow {
  id: string
  fullName: string
  email: string
  role: string
  status: string
  createdAt: string
}

export async function getUsers(): Promise<UserRow[]> {
  const res = await apiFetch('/api/users')
  if (!res.ok) throw new Error('Failed to load users')
  return res.json()
}

export async function updateUser(id: string, role: string, status: string): Promise<void> {
  const res = await apiFetch(`/api/users/${id}`, { method: 'POST', body: JSON.stringify({ role, status }) })
  if (!res.ok) throw new Error('Failed to update user')
}
