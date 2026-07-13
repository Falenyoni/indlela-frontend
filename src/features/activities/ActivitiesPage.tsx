import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivities, createActivity, updateActivity, toggleActivity, type ActivityRow } from './activitiesApi'

const CATEGORIES = ['Adventure', 'Cultural', 'Wellness', 'Dining', 'Transfer', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Adventure: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Cultural: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Wellness: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  Dining: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const emptyForm = { name: '', description: '', category: 'Adventure', pricePerPerson: '0', durationMinutes: '60', maxParticipants: '' }

export function ActivitiesPage() {
  const qc = useQueryClient()
  const { data: activities = [] } = useQuery({ queryKey: ['activities'], queryFn: getActivities })
  const [modal, setModal] = useState<null | 'add' | ActivityRow>(null)
  const [form, setForm] = useState(emptyForm)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['activities'] })

  const save = useMutation({
    mutationFn: async () => {
      const data = {
        name: form.name, description: form.description || null, category: form.category,
        pricePerPerson: Number(form.pricePerPerson), durationMinutes: Number(form.durationMinutes),
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
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
      ? { name: a.name, description: a.description ?? '', category: a.category, pricePerPerson: String(a.pricePerPerson), durationMinutes: String(a.durationMinutes), maxParticipants: a.maxParticipants != null ? String(a.maxParticipants) : '' }
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
        <button onClick={() => openModal('add')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Activity
        </button>
      </div>

      {CATEGORIES.filter(cat => grouped[cat].length > 0).map(cat => (
        <div key={cat} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat]}`}>{cat}</span>
            <span className="text-xs text-gray-400">{grouped[cat].length} {grouped[cat].length === 1 ? 'activity' : 'activities'}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>{['Name', 'Price / Person', 'Duration', 'Max Pax', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {grouped[cat].map(a => (
                <tr key={a.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!a.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{a.name}</div>
                    {a.description && <div className="text-xs text-gray-400 truncate max-w-xs">{a.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">R {a.pricePerPerson.toFixed(2)}</td>
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
                      <button onClick={() => toggle.mutate({ id: a.id, activate: !a.isActive })} className="text-xs text-gray-500 hover:underline">
                        {a.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center text-sm text-gray-400">
          No activities yet. Add your first activity to get started.
        </div>
      )}

      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{typeof modal === 'string' ? 'Add' : 'Edit'} Activity</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Description', key: 'description', type: 'text' },
              { label: 'Price per Person (R)', key: 'pricePerPerson', type: 'number' },
              { label: 'Duration (minutes)', key: 'durationMinutes', type: 'number' },
              { label: 'Max Participants (optional)', key: 'maxParticipants', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <input type={type} value={form[key as keyof typeof form] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => save.mutate()} disabled={save.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setModal(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">Cancel</button>
            </div>
            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
