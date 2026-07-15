import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getVehicles, getDrivers,
  getTransferRequests, assignTransferRequest,
  type TransferRequestRow, type AssignPayload,
} from './transportApi'

const STATUS_COLORS: Record<string, string> = {
  Pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Assigned:  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Confirmed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
}

const inputCls = 'w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

const today = new Date().toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

export function TransportPage() {
  const qc = useQueryClient()
  const [date, setDate] = useState(today)
  const [statusFilter, setStatusFilter] = useState('')
  const [assigning, setAssigning] = useState<TransferRequestRow | null>(null)
  const [assignForm, setAssignForm] = useState<AssignPayload>({ isSubcontracted: false })

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['transfer-requests', statusFilter, date],
    queryFn: () => getTransferRequests(statusFilter || undefined, date || undefined),
  })

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => getVehicles(),
    enabled: !!assigning && !assignForm.isSubcontracted,
  })

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => getDrivers(),
    enabled: !!assigning && !assignForm.isSubcontracted,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['transfer-requests'] })

  const assign = useMutation({
    mutationFn: () => assignTransferRequest(assigning!.id, assignForm),
    onSuccess: () => { invalidate(); closeAssign() },
  })

  const openAssign = (r: TransferRequestRow) => {
    setAssigning(r)
    setAssignForm({
      isSubcontracted: r.isSubcontracted,
      vehicleId: r.vehicleId ?? undefined,
      driverId: r.driverId ?? undefined,
      subcontractorName: r.subcontractorName ?? undefined,
    })
  }
  const closeAssign = () => { setAssigning(null); setAssignForm({ isSubcontracted: false }) }

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })

  const canSubmitAssign = assignForm.isSubcontracted
    ? !!assignForm.subcontractorName?.trim()
    : !!(assignForm.vehicleId || assignForm.driverId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dispatch Board</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Daily transfer assignments</p>
      </div>

      {/* Date + status filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden text-sm">
          {[{ label: 'Today', value: today }, { label: 'Tomorrow', value: tomorrow }].map(d => (
            <button key={d.value} onClick={() => setDate(d.value)}
              className={`px-4 py-2 font-medium transition-colors ${date === d.value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {d.label}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1.5 flex-wrap ml-auto">
          {['', 'Pending', 'Assigned', 'Confirmed', 'Completed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>{['Time', 'Ref', 'Guest', 'Route', 'Pax', 'Vehicle / Driver', 'Status', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>}
            {!isLoading && requests.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No transfers scheduled for this date</td></tr>
            )}
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtTime(r.pickupTime)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.reservationNumber}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{r.guestName}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[220px] truncate">{r.description}</td>
                <td className="px-4 py-3 text-gray-500">{r.pax}</td>
                <td className="px-4 py-3">
                  {r.isSubcontracted ? (
                    <span className="text-xs text-purple-600 dark:text-purple-400">Sub: {r.subcontractorName}</span>
                  ) : (r.vehicleId || r.driverId) ? (
                    <div className="space-y-0.5">
                      {r.driverName
                        ? <div className="text-xs text-gray-700 dark:text-gray-300">{r.driverName}</div>
                        : <div className="text-xs text-amber-500">No driver</div>}
                      {!r.vehicleId && (
                        <div className="text-xs text-amber-500">No vehicle</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {(r.status === 'Pending' || r.status === 'Assigned') && (
                    <button onClick={() => openAssign(r)} className="text-xs text-blue-600 hover:underline">
                      {r.status === 'Pending' ? 'Assign' : 'Re-assign'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          {requests.length} transfer{requests.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Assign modal */}
      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Assign Transfer</h3>
              <p className="text-sm text-gray-500 mt-0.5">{assigning.guestName} · {assigning.description}</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={assignForm.isSubcontracted}
                onChange={e => setAssignForm({ isSubcontracted: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Subcontracted (external provider)</span>
            </label>

            {assignForm.isSubcontracted ? (
              <div>
                <label className={labelCls}>Subcontractor Name *</label>
                <input value={assignForm.subcontractorName ?? ''}
                  onChange={e => setAssignForm(f => ({ ...f, subcontractorName: e.target.value }))}
                  placeholder="e.g. Victoria Falls Transfers" className={inputCls} />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Vehicle</label>
                  <select value={assignForm.vehicleId ?? ''} onChange={e => setAssignForm(f => ({ ...f, vehicleId: e.target.value || undefined }))} className={inputCls} disabled={vehiclesLoading}>
                    <option value="">{vehiclesLoading ? 'Loading…' : vehicles.filter(v => v.isActive).length === 0 ? 'No vehicles — add in Settings' : 'Select vehicle…'}</option>
                    {vehicles.filter(v => v.isActive).map(v => (
                      <option key={v.id} value={v.id}>{v.registration} — {v.make} {v.model} ({v.vehicleType}, {v.capacity} pax)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Driver</label>
                  <select value={assignForm.driverId ?? ''} onChange={e => setAssignForm(f => ({ ...f, driverId: e.target.value || undefined }))} className={inputCls} disabled={driversLoading}>
                    <option value="">{driversLoading ? 'Loading…' : drivers.filter(d => d.isActive).length === 0 ? 'No drivers — add in Settings' : 'Select driver…'}</option>
                    {drivers.filter(d => d.isActive).map(d => (
                      <option key={d.id} value={d.id}>{d.isInternal ? '● ' : '○ '}{d.fullName} ({d.licenseNumber}){d.isInternal ? ' — Internal' : ' — Subcontracted'}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!assignForm.isSubcontracted && canSubmitAssign && (!assignForm.vehicleId || !assignForm.driverId) && (
              <p className="text-xs text-amber-500">
                {!assignForm.vehicleId ? 'No vehicle selected — remember to assign one before pickup.' : 'No driver selected — remember to assign one before pickup.'}
              </p>
            )}
            {assign.isError && <p className="text-sm text-red-500">{String(assign.error)}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => assign.mutate()} disabled={assign.isPending || !canSubmitAssign}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {assign.isPending ? 'Saving…' : 'Confirm Assignment'}
              </button>
              <button onClick={closeAssign}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
