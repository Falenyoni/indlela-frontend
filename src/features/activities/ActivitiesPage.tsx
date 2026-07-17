import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivities, createActivity, updateActivity, toggleActivity, type ActivityRow } from './activitiesApi'
import { ActivityImportModal } from './ActivityImportModal'

const CATEGORIES = ['Adventure', 'Cultural', 'Wellness', 'Dining', 'Transfer', 'ParkFee', 'Helicopter', 'Other']

const CAT_LABELS: Record<string, string> = { ParkFee: 'Park Fee' }
const catLabel = (cat: string) => CAT_LABELS[cat] ?? cat

const CATEGORY_COLORS: Record<string, string> = {
  Adventure:  'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Cultural:   'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Wellness:   'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  Dining:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Transfer:   'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ParkFee:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  Helicopter: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  Other:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const inputCls = 'w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'

const emptyForm = {
  name: '', description: '', category: 'Adventure',
  pricePerPerson: '0', childPricePerPerson: '',
  durationMinutes: '60', maxParticipants: '',
}

type FormState = typeof emptyForm

export function ActivitiesPage() {
  const qc = useQueryClient()
  const { data: activities = [] } = useQuery({ queryKey: ['activities'], queryFn: () => getActivities() })
  const [modal, setModal] = useState<null | 'add' | ActivityRow>(null)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['activities'] })

  const save = useMutation({
    mutationFn: async () => {
      const data = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        pricePerPerson: Number(form.pricePerPerson),
        childPricePerPerson: form.childPricePerPerson ? Number(form.childPricePerPerson) : null,
        durationMinutes: Number(form.durationMinutes),
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
        isActive: true,
      }
      if (typeof modal === 'object' && modal) await updateActivity(modal.id, data)
      else await createActivity(data)
    },
    onSuccess: () => { setModal(null); invalidate() },
  })

  const toggle = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) => toggleActivity(id, activate),
    onSuccess: invalidate,
  })

  const openModal = (a: 'add' | ActivityRow) => {
    setModal(a)
    setForm(typeof a === 'object'
      ? {
          name: a.name, description: a.description ?? '', category: a.category,
          pricePerPerson: String(a.pricePerPerson),
          childPricePerPerson: a.childPricePerPerson != null ? String(a.childPricePerPerson) : '',
          durationMinutes: String(a.durationMinutes),
          maxParticipants: a.maxParticipants != null ? String(a.maxParticipants) : '',
        }
      : emptyForm)
  }

  const grouped = CATEGORIES.reduce<Record<string, ActivityRow[]>>((acc, cat) => {
    acc[cat] = activities.filter(a => a.category === cat)
    return acc
  }, {})

  const fmt = (mins: number) => mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activities</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage bookable activities and pricing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
            ↑ Import
          </button>
          <button onClick={() => openModal('add')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            + Add Activity
          </button>
        </div>
      </div>

      {CATEGORIES.filter(cat => grouped[cat].length > 0).map(cat => (
        <div key={cat} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat]}`}>{catLabel(cat)}</span>
            <span className="text-xs text-gray-400">{grouped[cat].length} {grouped[cat].length === 1 ? 'activity' : 'activities'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                <tr>{['Name', 'Adult Rate', 'Child Rate', 'Duration', 'Max Pax', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {grouped[cat].map(a => (
                  <tr key={a.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!a.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{a.name}</div>
                      {a.description && <div className="text-xs text-gray-400 truncate max-w-xs">{a.description}</div>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">R {a.pricePerPerson.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.childPricePerPerson != null ? `R ${a.childPricePerPerson.toFixed(2)}` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmt(a.durationMinutes)}</td>
                    <td className="px-4 py-3 text-gray-500">{a.maxParticipants ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openModal(a)} className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => toggle.mutate({ id: a.id, activate: !a.isActive })} disabled={toggle.isPending} className="text-xs text-gray-500 hover:underline">
                          {a.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center text-sm text-gray-400">
          No activities yet. Add your first activity to get started.
        </div>
      )}

      {showImport && <ActivityImportModal onClose={() => setShowImport(false)} />}

      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{typeof modal === 'string' ? 'Add' : 'Edit'} Activity</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adult Rate (R) *</label>
                <input type="number" min={0} step={0.01} value={form.pricePerPerson}
                  onChange={e => setForm(f => ({ ...f, pricePerPerson: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Child Rate (R, optional)</label>
                <input type="number" min={0} step={0.01} value={form.childPricePerPerson}
                  onChange={e => setForm(f => ({ ...f, childPricePerPerson: e.target.value }))}
                  placeholder="Leave blank if same as adult or N/A" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
                <input type="number" min={1} value={form.durationMinutes}
                  onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Participants</label>
                <input type="number" min={1} value={form.maxParticipants}
                  onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value }))}
                  placeholder="Unlimited" className={inputCls} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setModal(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
            </div>
            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
