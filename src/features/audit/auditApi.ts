import { apiFetch } from '@/shared/lib/api/apiFetch'

export type AuditLogDto = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  userId: string
  userName: string
  payload: string | null
  createdAt: string
}

export type AuditLogsResult = {
  items: AuditLogDto[]
  totalCount: number
  page: number
  pageSize: number
}

export type AuditLogsParams = {
  entityType?: string
  entityId?: string
  action?: string
  userId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export async function getAuditLogs(params: AuditLogsParams = {}): Promise<AuditLogsResult> {
  const qs = new URLSearchParams()
  if (params.entityType) qs.set('entityType', params.entityType)
  if (params.entityId)   qs.set('entityId', params.entityId)
  if (params.action)     qs.set('action', params.action)
  if (params.userId)     qs.set('userId', params.userId)
  if (params.from)       qs.set('from', params.from)
  if (params.to)         qs.set('to', params.to)
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 50))

  const res = await apiFetch(`/api/audit-logs?${qs}`)
  if (!res.ok) throw new Error('Failed to load audit logs')
  return res.json()
}
