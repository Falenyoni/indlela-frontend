import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAgents, createAgent, updateAgent, toggleAgent,
  getAgentRateSheets, createAgentRateSheet, updateAgentRateSheet, toggleAgentRateSheet,
  type AgentRow, type AgentPayload, type AgentRateSheetRow, type AgentRateSheetPayload,
} from './agentsApi'

type Tab = 'agents' | 'rates'

const PRODUCT_TYPES = ['Accommodation', 'Transfer', 'Activity', 'ParkFee', 'Helicopter', 'Other']
const PT_LABELS: Record<string, string> = { ParkFee: 'Park Fee' }
const ptLabel = (pt: string) => PT_LABELS[pt] ?? pt

const inputCls = 'w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

// ─── Agents tab ───────────────────────────────────────────────────────────────

const emptyAgent: AgentPayload = {
  name: '', contactPerson: null, email: null, phone: null,
  discountPercent: 0, creditTermDays: 30, creditLimit: 0, notes: null,
}

function AgentsTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AgentRow | null>(null)
  const [form, setForm] = useState<AgentPayload>(emptyAgent)

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

  const openCreate = () => { setEditing(null); setForm(emptyAgent); setShowForm(true) }
  const openEdit = (a: AgentRow) => {
    setEditing(a)
    setForm({ name: a.name, contactPerson: a.contactPerson, email: a.email, phone: a.phone, discountPercent: a.discountPercent, creditTermDays: a.creditTermDays, creditLimit: a.creditLimit, notes: a.notes })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyAgent) }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <input placeholder="Search agents…" value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-sm'} />
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
          + Add Agent
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>{['Agent', 'Contact', 'Email', 'Phone', 'Fallback Discount', 'Credit Terms', 'Credit Limit', 'Status', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}</tr>
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
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">{agents.length} agent{agents.length !== 1 ? 's' : ''}</div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Agent' : 'New Agent'}</h3>

            <div>
              <label className={labelCls}>Agency / Company Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Wilderness Safaris" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([
                ['Contact Person', 'contactPerson', 'text', 'e.g. Jane Doe'],
                ['Email', 'email', 'email', 'agent@email.com'],
                ['Phone', 'phone', 'tel', '+27 11 000 0000'],
              ] as [string, keyof AgentPayload, string, string][]).map(([label, key, type, placeholder]) => (
                <div key={String(key)}>
                  <label className={labelCls}>{label}</label>
                  <input type={type} placeholder={placeholder} value={(form[key] as string) ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value || null }))} className={inputCls} />
                </div>
              ))}
              <div>
                <label className={labelCls}>Fallback Discount Off Rack (%)</label>
                <input type="number" min={0} max={100} step={0.5} value={form.discountPercent}
                  onChange={e => setForm(f => ({ ...f, discountPercent: Number(e.target.value) }))} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Credit Terms (days)</label>
                <input type="number" min={0} value={form.creditTermDays}
                  onChange={e => setForm(f => ({ ...f, creditTermDays: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Credit Limit (R)</label>
                <input type="number" min={0} value={form.creditLimit}
                  onChange={e => setForm(f => ({ ...f, creditLimit: Number(e.target.value) }))} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <textarea rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))} className={inputCls + ' resize-none'} />
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
    </>
  )
}

// ─── Rate Sheets tab ──────────────────────────────────────────────────────────

const emptyRateSheet: AgentRateSheetPayload = {
  agentId: '', agentName: '', productType: 'Accommodation',
  adultRate: 0, validFrom: '', validTo: '',
}

type RateSheetEditForm = {
  adultRate: number
  childRate: string
  validFrom: string
  validTo: string
}

function RateSheetsTab() {
  const qc = useQueryClient()
  const [agentFilter, setAgentFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<AgentRateSheetRow | null>(null)
  const [createForm, setCreateForm] = useState<AgentRateSheetPayload>(emptyRateSheet)
  const [editForm, setEditForm] = useState<RateSheetEditForm>({ adultRate: 0, childRate: '', validFrom: '', validTo: '' })

  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => getAgents() })
  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ['agent-rate-sheets', agentFilter],
    queryFn: () => getAgentRateSheets(agentFilter || undefined),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['agent-rate-sheets'] })

  const create = useMutation({
    mutationFn: () => {
      const agent = agents.find(a => a.id === createForm.agentId)
      return createAgentRateSheet({ ...createForm, agentName: agent?.name ?? '' })
    },
    onSuccess: () => { invalidate(); setShowCreate(false); setCreateForm(emptyRateSheet) },
  })

  const update = useMutation({
    mutationFn: () => updateAgentRateSheet(editing!.id, {
      adultRate: editForm.adultRate,
      childRate: editForm.childRate ? Number(editForm.childRate) : undefined,
      validFrom: editForm.validFrom,
      validTo: editForm.validTo,
    }),
    onSuccess: () => { invalidate(); setEditing(null) },
  })

  const toggleSheet = useMutation({
    mutationFn: (id: string) => toggleAgentRateSheet(id),
    onSuccess: invalidate,
  })

  const openEdit = (s: AgentRateSheetRow) => {
    setEditing(s)
    setEditForm({ adultRate: s.adultRate, childRate: s.childRate != null ? String(s.childRate) : '', validFrom: s.validFrom, validTo: s.validTo })
  }

  const canCreate = createForm.agentId && createForm.productType && createForm.adultRate > 0 && createForm.validFrom && createForm.validTo
  const canUpdate = editForm.adultRate > 0 && editForm.validFrom && editForm.validTo

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className={inputCls + ' max-w-xs'}>
          <option value="">All agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
          + Add Rate Sheet
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>{['Agent', 'Product Type', 'Product', 'Adult Rate', 'Child Rate', 'Valid From', 'Valid To', 'Status', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>}
            {!isLoading && sheets.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No rate sheets yet</td></tr>}
            {sheets.map((s: AgentRateSheetRow) => (
              <tr key={s.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!s.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{s.agentName}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{ptLabel(s.productType)}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{s.productName ?? <span className="italic text-gray-300 dark:text-gray-600">Any</span>}</td>
                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">R {s.adultRate.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500">{s.childRate != null ? `R ${s.childRate.toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.validFrom}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.validTo}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggleSheet.mutate(s.id)} disabled={toggleSheet.isPending}
                      className={`text-xs hover:underline ${s.isActive ? 'text-red-500' : 'text-green-600'}`}>
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">{sheets.length} rate sheet{sheets.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Rate Sheet</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Agent *</label>
                <select value={createForm.agentId} onChange={e => setCreateForm(f => ({ ...f, agentId: e.target.value }))} className={inputCls}>
                  <option value="">Select agent…</option>
                  {agents.filter(a => a.isActive).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Product Type *</label>
                <select value={createForm.productType} onChange={e => setCreateForm(f => ({ ...f, productType: e.target.value }))} className={inputCls}>
                  {PRODUCT_TYPES.map(pt => <option key={pt} value={pt}>{ptLabel(pt)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Product Name (optional)</label>
                <input value={createForm.productName ?? ''} onChange={e => setCreateForm(f => ({ ...f, productName: e.target.value || undefined }))}
                  placeholder="Leave blank to match all" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Adult Rate (R) *</label>
                <input type="number" min={0} step={0.01} value={createForm.adultRate}
                  onChange={e => setCreateForm(f => ({ ...f, adultRate: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Child Rate (R, optional)</label>
                <input type="number" min={0} step={0.01} value={createForm.childRate ?? ''}
                  onChange={e => setCreateForm(f => ({ ...f, childRate: e.target.value ? Number(e.target.value) : undefined }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Valid From *</label>
                <input type="date" value={createForm.validFrom} onChange={e => setCreateForm(f => ({ ...f, validFrom: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Valid To *</label>
                <input type="date" value={createForm.validTo} onChange={e => setCreateForm(f => ({ ...f, validTo: e.target.value }))} className={inputCls} />
              </div>
            </div>

            {create.isError && <p className="text-sm text-red-500">{String(create.error)}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => create.mutate()} disabled={create.isPending || !canCreate}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {create.isPending ? 'Saving…' : 'Create Rate Sheet'}
              </button>
              <button onClick={() => { setShowCreate(false); setCreateForm(emptyRateSheet) }}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Rate Sheet</h3>
              <p className="text-sm text-gray-500 mt-0.5">{editing.agentName} · {ptLabel(editing.productType)}{editing.productName ? ` · ${editing.productName}` : ''}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Adult Rate (R) *</label>
                <input type="number" min={0} step={0.01} value={editForm.adultRate}
                  onChange={e => setEditForm(f => ({ ...f, adultRate: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Child Rate (R, optional)</label>
                <input type="number" min={0} step={0.01} value={editForm.childRate}
                  onChange={e => setEditForm(f => ({ ...f, childRate: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Valid From *</label>
                <input type="date" value={editForm.validFrom} onChange={e => setEditForm(f => ({ ...f, validFrom: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Valid To *</label>
                <input type="date" value={editForm.validTo} onChange={e => setEditForm(f => ({ ...f, validTo: e.target.value }))} className={inputCls} />
              </div>
            </div>
            {update.isError && <p className="text-sm text-red-500">{String(update.error)}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => update.mutate()} disabled={update.isPending || !canUpdate}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {update.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AgentsPage() {
  const [tab, setTab] = useState<Tab>('agents')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agents</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Travel agents, tour operators, and their contracted rate sheets</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1">
          {([['agents', 'Agents'], ['rates', 'Rate Sheets']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'agents' && <AgentsTab />}
      {tab === 'rates'  && <RateSheetsTab />}
    </div>
  )
}
