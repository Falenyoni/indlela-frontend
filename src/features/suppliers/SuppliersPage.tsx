import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSuppliers, createSupplier, updateSupplier, toggleSupplier, type SupplierRow, type SupplierPayload } from './suppliersApi'

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'BWP', 'ZMW', 'KES', 'TZS']

const emptyForm: SupplierPayload = {
  name: '', contactPerson: null, email: null, phone: null,
  currency: 'ZAR', paymentTermDays: 30, notes: null,
}

export function SuppliersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SupplierRow | null>(null)
  const [form, setForm] = useState<SupplierPayload>(emptyForm)

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => getSuppliers(search || undefined),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['suppliers'] })

  const save = useMutation({
    mutationFn: () => editing
      ? updateSupplier(editing.id, form)
      : createSupplier(form),
    onSuccess: () => { invalidate(); closeForm() },
  })

  const toggle = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) => toggleSupplier(id, activate),
    onSuccess: invalidate,
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (s: SupplierRow) => {
    setEditing(s)
    setForm({ name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, currency: s.currency, paymentTermDays: s.paymentTermDays, notes: s.notes })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm) }

  const inp = (value: string, onChange: (v: string) => void, placeholder = '', type = 'text') => (
    <input type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
  )

  const field = (label: string, node: React.ReactNode) => (
    <div key={label}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {node}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Suppliers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Third-party service providers and product suppliers</p>
        </div>
        <button onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Supplier
        </button>
      </div>

      <input
        placeholder="Search suppliers…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>
              {['Supplier', 'Contact Person', 'Email', 'Phone', 'Currency', 'Payment Terms', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            )}
            {!isLoading && suppliers.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No suppliers yet</td></tr>
            )}
            {suppliers.map((s: SupplierRow) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{s.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.contactPerson ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{s.currency}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.paymentTermDays} days</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button
                      onClick={() => toggle.mutate({ id: s.id, activate: !s.isActive })}
                      disabled={toggle.isPending}
                      className={`text-xs hover:underline ${s.isActive ? 'text-red-500' : 'text-green-600'}`}>
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editing ? 'Edit Supplier' : 'New Supplier'}
            </h3>

            <div className="space-y-3">
              {field('Supplier Name *', inp(form.name, v => setForm(f => ({ ...f, name: v })), 'e.g. Shearwater Adventures'))}
              {field('Contact Person', inp(form.contactPerson ?? '', v => setForm(f => ({ ...f, contactPerson: v || null })), 'e.g. Jane Doe'))}

              <div className="grid grid-cols-2 gap-3">
                {field('Email', inp(form.email ?? '', v => setForm(f => ({ ...f, email: v || null })), 'supplier@email.com', 'email'))}
                {field('Phone', inp(form.phone ?? '', v => setForm(f => ({ ...f, phone: v || null })), '+27 11 000 0000', 'tel'))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {field('Billing Currency',
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                {field('Payment Terms (days)',
                  <input type="number" min={0} value={form.paymentTermDays}
                    onChange={e => setForm(f => ({ ...f, paymentTermDays: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>

              {field('Notes',
                <textarea rows={2} placeholder="Any additional notes…" value={form.notes ?? ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              )}
            </div>

            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => save.mutate()} disabled={save.isPending || !form.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Supplier'}
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
