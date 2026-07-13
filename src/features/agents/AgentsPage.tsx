import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAgents, createAgent, updateAgent, toggleAgent, type AgentRow, type AgentPayload } from './agentsApi'

const emptyForm: AgentPayload = {
  name: '', contactPerson: null, email: null, phone: null,
  discountPercent: 0, creditTermDays: 30, creditLimit: 0, notes: null,
}

export function AgentsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AgentRow | null>(null)
  const [form, setForm] = useState<AgentPayload>(emptyForm)

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents', search],
    queryFn: () => getAgents(search || undefined),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['agents'] })

  const save = useMutation({
    mutationFn: () => editing ? updateAgent(editing.id, form) : createAgent(form),
    onSuccess: () => { invalidate(); closeForm() },
  })

  const toggle = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) => toggleAgent(id, activate),
    onSuccess: invalidate,
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (a: AgentRow) => {
    setEditing(a)
    setForm({ name: a.name, contactPerson: a.contactPerson, email: a.email, phone: a.phone, discountPercent: a.discountPercent, creditTermDays: a.creditTermDays, creditLimit: a.creditLimit, notes: a.notes })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agents</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Travel agents and tour operators who book on behalf of clients</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Agent
        </button>
      </div>

      <input placeholder="Search agents…" value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>
              {['Agent', 'Contact', 'Email', 'Phone', 'Discount', 'Credit Terms', 'Credit Limit', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>}
            {!isLoading && agents.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No agents yet</td></tr>}
            {agents.map((a: AgentRow) => (
              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{a.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.contactPerson ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    {a.discountPercent}%
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.creditTermDays} days</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {a.creditLimit > 0 ? `R ${a.creditLimit.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggle.mutate({ id: a.id, activate: !a.isActive })} disabled={toggle.isPending}
                      className={`text-xs hover:underline ${a.isActive ? 'text-red-500' : 'text-green-600'}`}>
                      {a.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Agent' : 'New Agent'}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Agency / Company Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Wilderness Safaris"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  ['Contact Person', 'contactPerson', 'text', 'e.g. Jane Doe'],
                  ['Email', 'email', 'email', 'agent@email.com'],
                  ['Phone', 'phone', 'tel', '+27 11 000 0000'],
                ] as [string, keyof AgentPayload, string, string][]).map(([label, key, type, placeholder]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                    <input type={type} placeholder={placeholder} value={(form[key] as string) ?? ''}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value || null }))}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Discount Off Rack (%)</label>
                  <input type="number" min={0} max={100} step={0.5} value={form.discountPercent}
                    onChange={e => setForm(f => ({ ...f, discountPercent: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Credit Terms (days)</label>
                  <input type="number" min={0} value={form.creditTermDays}
                    onChange={e => setForm(f => ({ ...f, creditTermDays: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Credit Limit (R)</label>
                  <input type="number" min={0} value={form.creditLimit}
                    onChange={e => setForm(f => ({ ...f, creditLimit: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <textarea rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => save.mutate()} disabled={save.isPending || !form.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Agent'}
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
