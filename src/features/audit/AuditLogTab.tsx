import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs, type AuditLogsParams } from './auditApi'

const ENTITY_TYPES = ['', 'Reservation', 'LineItem', 'Payment', 'Driver', 'Vehicle',
  'User', 'Role', 'DiscountRequest', 'Document']

export function AuditLogTab() {
  const [filters, setFilters] = useState<AuditLogsParams>({ page: 1, pageSize: 50 })
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: () => getAuditLogs({ ...filters, page }),
  })

  const set = (key: keyof AuditLogsParams, value: string) =>
    setFilters(f => ({ ...f, [key]: value || undefined }))

  const totalPages = data ? Math.ceil(data.totalCount / (filters.pageSize ?? 50)) : 0

  const inputCls = 'border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Entity Type</label>
          <select className={inputCls} value={filters.entityType ?? ''} onChange={e => set('entityType', e.target.value)}>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Action contains</label>
          <input className={inputCls} placeholder="e.g. Create" value={filters.action ?? ''}
            onChange={e => set('action', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" className={inputCls} value={filters.from ?? ''}
            onChange={e => set('from', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" className={inputCls} value={filters.to ?? ''}
            onChange={e => set('to', e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                <tr>
                  {['When', 'User', 'Action', 'Entity', 'Entity ID'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data?.items.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No audit entries found.</td></tr>
                )}
                {data?.items.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{log.entityType}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {log.entityId ? log.entityId.slice(0, 8) + '…' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {data?.totalCount} entries — page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
