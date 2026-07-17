import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLocations, createLocation, updateLocation, toggleLocation, LOCATION_TYPES, type LocationRow, type LocationPayload } from './locationsApi'
import { LocationImportModal } from './LocationImportModal'

const TYPE_COLORS: Record<string, string> = {
  Airport: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Hotel: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Lodge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Camp: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Harbour: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  Border: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  CityCenter: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const emptyForm: LocationPayload = { name: '', type: 'Hotel', region: null, notes: null }

export function LocationsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LocationRow | null>(null)
  const [form, setForm] = useState<LocationPayload>(emptyForm)

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', search, typeFilter],
    queryFn: () => getLocations(search || undefined, typeFilter || undefined),
  })

  const regions = [...new Set(locations.map(l => l.region).filter(Boolean))].sort() as string[]

  const invalidate = () => qc.invalidateQueries({ queryKey: ['locations'] })

  const save = useMutation({
    mutationFn: () => editing ? updateLocation(editing.id, form) : createLocation(form),
    onSuccess: () => { invalidate(); closeForm() },
  })

  const toggle = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) => toggleLocation(id, activate),
    onSuccess: invalidate,
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (l: LocationRow) => {
    setEditing(l)
    setForm({ name: l.name, type: l.type, region: l.region, notes: l.notes })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm) }

  const grouped = locations.reduce<Record<string, LocationRow[]>>((acc, l) => {
    const key = l.region ?? 'No Region'
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Locations</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hotels, lodges, airports and pickup points</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            ↑ Import
          </button>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            + Add Location
          </button>
        </div>
      </div>
      {showImport && <LocationImportModal onClose={() => setShowImport(false)} />}

      <div className="flex gap-3 flex-wrap">
        <input placeholder="Search locations…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Types</option>
          {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
      ) : locations.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
          <p className="text-sm text-gray-400">No locations yet. Add hotels, lodges, airports and transfer points.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([region, locs]) => (
            <div key={region} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{region}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {locs.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{l.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[l.type] ?? TYPE_COLORS.Other}`}>{l.type}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{l.notes ?? ''}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {l.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => openEdit(l)} className="text-xs text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => toggle.mutate({ id: l.id, activate: !l.isActive })} disabled={toggle.isPending}
                            className={`text-xs hover:underline ${l.isActive ? 'text-red-500' : 'text-green-600'}`}>
                            {l.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editing ? 'Edit Location' : 'New Location'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Victoria Falls Hotel"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Region</label>
                  <input value={form.region ?? ''} onChange={e => setForm(f => ({ ...f, region: e.target.value || null }))}
                    placeholder="e.g. Victoria Falls"
                    list="regions-list"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <datalist id="regions-list">
                    {regions.map(r => <option key={r} value={r} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <textarea rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
                  placeholder="Gate info, terminal, access instructions…"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => save.mutate()} disabled={save.isPending || !form.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Location'}
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
