import { apiFetch } from '@/shared/lib/api/apiFetch'

export interface AgentRow {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  discountPercent: number
  creditTermDays: number
  creditLimit: number
  notes: string | null
  isActive: boolean
}

export type AgentPayload = Omit<AgentRow, 'id' | 'isActive'>

export async function getAgents(search?: string): Promise<AgentRow[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await apiFetch(`/api/agents${qs}`)
  if (!res.ok) throw new Error('Failed to load agents')
  return res.json()
}

export async function createAgent(data: AgentPayload): Promise<void> {
  const res = await apiFetch('/api/agents', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create agent')
}

export async function updateAgent(id: string, data: AgentPayload): Promise<void> {
  const res = await apiFetch(`/api/agents/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update agent')
}

export async function toggleAgent(id: string, activate: boolean): Promise<void> {
  const res = await apiFetch(`/api/agents/${id}/${activate ? 'activate' : 'deactivate'}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to update agent status')
}
