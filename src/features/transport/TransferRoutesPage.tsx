import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTransferRoutes, createTransferRoute, updateTransferRoute, toggleTransferRoute,
  type TransferRouteRow, type TransferRoutePayload,
} from './transfersApi'

const emptyForm: TransferRoutePayload = {
  pickupLocationId: null, pickupLocationName: '',
  dropoffLocationId: null, dropoffLocationName: '',
  vehicleType: '', maxPassengers: 1, rackRate: 0, costRate: 0, notes: null,
}

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Minibus (8 pax)', 'Minibus (14 pax)', 'Coach (26 pax)', 'Coach (50 pax)', 'Speedboat', 'Charter Flight', 'Other']

export function TransferRoutesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TransferRouteRow | null>(null)
  const [form, setForm] = useState<TransferRoutePayload>(emptyForm)

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['transfer-routes', search],
    queryFn: () => getTransferRoutes(search || undefined),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['transfer-routes'] })

  const save = useMutation({
    mutationFn: () => editing
      ? updateTransferRoute(editing.id, form)
      : createTransferRoute(form).then(() => undefined),
    onSuccess: () => { invalidate(); closeForm() },
  })

  const toggle = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) => toggleTransferRoute(id, activate),
    onSuccess: invalidate,
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (r: TransferRouteRow) => {
    setEditing(r)
    setForm({
      pickupLocationId: r.pickupLocationId, pickupLocationName: r.pickupLocationName,
      dropoffLocationId: r.dropoffLocationId, dropoffLocationName: r.dropoffLocationName,
      vehicleType: r.vehicleType, maxPassengers: r.maxPassengers,
      rackRate: r.rackRate, costRate: r.costRate, notes: r.notes,
    })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm) }

  const isValid = form.pickupLocationName.trim() && form.dropoffLocationName.trim() && form.vehicleType && form.maxPassengers > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transfer Routes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pre-defined transfers used when building booking itineraries</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Route
        </button>
      </div>

      <input placeholder="Search by pickup, dropoff or vehicle…" value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>
              {['Pickup', 'Dropoff', 'Vehicle', 'Max Pax', 'Rack Rate', 'Cost Rate', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>}
            {!isLoading && routes.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No transfer routes yet</td></tr>}
            {routes.map((r: TransferRouteRow) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.pickupLocationName}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.dropoffLocationName}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                    {r.vehicleType}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.maxPassengers}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">R {r.rackRate.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">R {r.costRate.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggle.mutate({ id: r.id, activate: !r.isActive })} disabled={toggle.isPending}
                      className={`text-xs hover:underline ${r.isActive ? 'text-red-500' : 'text-green-600'}`}>
                      {r.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          {routes.length} route{routes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Transfer Route' : 'New Transfer Route'}</h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pickup Location *</label>
                  <input value={form.pickupLocationName} onChange={e => setForm(f => ({ ...f, pickupLocationName: e.target.value }))}
                    placeholder="e.g. OR Tambo Airport"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dropoff Location *</label>
                  <input value={form.dropoffLocationName} onChange={e => setForm(f => ({ ...f, dropoffLocationName: e.target.value }))}
                    placeholder="e.g. Sandton City Hotel"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Vehicle Type *</label>
                  <select value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select vehicle…</option>
                    {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Passengers *</label>
                  <input type="number" min={1} value={form.maxPassengers}
                    onChange={e => setForm(f => ({ ...f, maxPassengers: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rack Rate (R) *</label>
                  <input type="number" min={0} step={0.01} value={form.rackRate}
                    onChange={e => setForm(f => ({ ...f, rackRate: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cost Rate (R)</label>
                  <input type="number" min={0} step={0.01} value={form.costRate}
                    onChange={e => setForm(f => ({ ...f, costRate: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <textarea rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
                  placeholder="e.g. Meet & greet included, toll fees extra"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => save.mutate()} disabled={save.isPending || !isValid}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Route'}
              </button>
              <button onClick={closeForm}
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
