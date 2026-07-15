import { apiFetch } from '@/shared/lib/api/apiFetch'

// ── Branding ──────────────────────────────────────────────────────────────────

export interface BrandingDto {
  organizationName: string
  primaryColor: string | null
  logoBase64: string | null
}

export async function getBranding(): Promise<BrandingDto> {
  const res = await apiFetch('/api/branding')
  if (!res.ok) throw new Error('Failed to load branding')
  return res.json()
}

export async function updateBranding(data: { primaryColor: string | null; logoBase64?: string | null }): Promise<void> {
  const res = await apiFetch('/api/branding', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to save branding')
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string
  fullName: string
  email: string
  roles: string[]
  status: string
  createdAt: string
}

export async function getUsers(search?: string): Promise<UserRow[]> {
  const qs = new URLSearchParams()
  if (search) qs.set('search', search)
  const res = await apiFetch(`/api/users?${qs}`)
  if (!res.ok) throw new Error('Failed to load users')
  return res.json()
}

export async function createUser(data: {
  firstName: string
  lastName: string
  email: string
  password: string
  roleIds: string[]
}): Promise<string> {
  const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? 'Failed to create user')
  }
  return res.json()
}

export async function updateUser(id: string, data: {
  firstName: string
  lastName: string
  isActive: boolean
}): Promise<void> {
  const res = await apiFetch(`/api/users/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update user')
}

export async function assignUserRoles(userId: string, roleIds: string[]): Promise<void> {
  const res = await apiFetch(`/api/users/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ userId, roleIds }),
  })
  if (!res.ok) throw new Error('Failed to assign roles')
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export interface RoleRow {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  isActive: boolean
  permissions: string[]
}

export async function getRoles(): Promise<RoleRow[]> {
  const res = await apiFetch('/api/roles')
  if (!res.ok) throw new Error('Failed to load roles')
  return res.json()
}

export async function createRole(data: {
  name: string
  description: string
  permissions: string[]
}): Promise<string> {
  const res = await apiFetch('/api/roles', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? 'Failed to create role')
  }
  return res.json()
}

export async function updateRole(id: string, data: {
  name: string
  description: string
  permissions: string[]
  isActive: boolean
}): Promise<void> {
  const res = await apiFetch(`/api/roles/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update role')
}

// ── Permissions ───────────────────────────────────────────────────────────────

export async function getPermissions(): Promise<string[]> {
  const res = await apiFetch('/api/permissions')
  if (!res.ok) throw new Error('Failed to load permissions')
  return res.json()
}
