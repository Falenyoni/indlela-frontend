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

// Agent Rate Sheets
export interface AgentRateSheetRow {
  id: string
  agentId: string
  agentName: string
  productType: string
  productId: string | null
  productName: string | null
  adultRate: number
  childRate: number | null
  validFrom: string
  validTo: string
  isActive: boolean
}

export interface AgentRateSheetPayload {
  agentId: string
  agentName: string
  productType: string
  productId?: string
  productName?: string
  adultRate: number
  childRate?: number
  validFrom: string
  validTo: string
}

export async function getAgentRateSheets(agentId?: string): Promise<AgentRateSheetRow[]> {
  const qs = agentId ? `?agentId=${agentId}` : ''
  const res = await apiFetch(`/api/agent-rate-sheets${qs}`)
  if (!res.ok) throw new Error('Failed to load agent rate sheets')
  return res.json()
}

export async function createAgentRateSheet(data: AgentRateSheetPayload): Promise<string> {
  const res = await apiFetch('/api/agent-rate-sheets', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create rate sheet')
  return res.json()
}

export async function updateAgentRateSheet(id: string, data: { adultRate: number; childRate?: number; validFrom: string; validTo: string }): Promise<void> {
  const res = await apiFetch(`/api/agent-rate-sheets/${id}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update rate sheet')
}

export async function toggleAgentRateSheet(id: string): Promise<void> {
  const res = await apiFetch(`/api/agent-rate-sheets/${id}/toggle`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle rate sheet')
}
