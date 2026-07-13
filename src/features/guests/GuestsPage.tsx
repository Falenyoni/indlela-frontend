import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGuests, getGuestById, registerGuest, updateGuest, type GuestRow, type RegisterGuestRequest } from './guestsApi'

const GENDERS = ['Male', 'Female', 'Other']
const DOC_TYPES = ['Passport', 'NationalId']

const emptyForm: RegisterGuestRequest = {
  firstName: '', lastName: '', middleName: null,
  dateOfBirth: '', gender: 'Male',
  documentType: 'Passport', documentNumber: '',
  nationality: null, contacts: [], addresses: null,
}

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

export function GuestsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [form, setForm] = useState<RegisterGuestRequest>(emptyForm)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', middleName: '', nationality: '', notes: '' })

  const { data: guestDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['guest', editingId],
    queryFn: () => getGuestById(editingId!),
    enabled: !!editingId,
  })

  useEffect(() => {
    if (guestDetail) {
      setEditForm({
        firstName: guestDetail.firstName,
        lastName: guestDetail.lastName,
        middleName: guestDetail.middleName ?? '',
        nationality: guestDetail.nationality ?? '',
        notes: guestDetail.notes ?? '',
      })
    }
  }, [guestDetail])

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests', search],
    queryFn: () => getGuests(search || undefined),
  })

  const edit = useMutation({
    mutationFn: () => updateGuest(editingId!, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      middleName: editForm.middleName || null,
      nationality: editForm.nationality || null,
      notes: editForm.notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests'] })
      setEditingId(null)
    },
  })

  const register = useMutation({
    mutationFn: () => {
      const contacts: RegisterGuestRequest['contacts'] = [
        { type: 'Phone', phoneNumber: phone, email: email || null, isPrimary: true },
      ]
      return registerGuest({ ...form, contacts })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests'] })
      setShowRegister(false)
      setForm(emptyForm)
      setPhone('')
      setEmail('')
    },
  })

  const field = (label: string, node: React.ReactNode) => (
    <div key={label}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {node}
    </div>
  )

  const inp = (placeholder: string, value: string, onChange: (v: string) => void, type = 'text') => (
    <input type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
  )

  const sel = (value: string, options: string[], onChange: (v: string) => void) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  const canSubmit = form.firstName && form.lastName && form.dateOfBirth && form.documentNumber && phone

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Guests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Traveller profiles and document records</p>
        </div>
        <button onClick={() => setShowRegister(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Register Guest
        </button>
      </div>

      <div className="flex gap-3">
        <input
          placeholder="Search by name or document number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>
              {['Full Name', 'Document', 'Date of Birth', 'Gender', 'Nationality', 'Status', 'Registered', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            )}
            {!isLoading && guests.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No guests found</td></tr>
            )}
            {guests.map((g: GuestRow) => (
              <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{g.fullName}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{g.documentNumber}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{g.dateOfBirth}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{g.gender}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{g.nationality ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[g.status] ?? ''}`}>
                    {g.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(g.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditingId(g.id)} className="text-xs text-blue-600 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          {guests.length} guest{guests.length !== 1 ? 's' : ''}
        </div>
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Guest</h3>

            {loadingDetail ? (
              <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
            ) : (
              <>
                {guestDetail && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div><span className="font-medium">Document:</span> {guestDetail.documentType} · {guestDetail.documentNumber}</div>
                    <div><span className="font-medium">Date of Birth:</span> {guestDetail.dateOfBirth} · <span className="font-medium">Gender:</span> {guestDetail.gender}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {field('First Name *',
                    <input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  {field('Last Name *',
                    <input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  {field('Middle Name',
                    <input value={editForm.middleName} onChange={e => setEditForm(f => ({ ...f, middleName: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  {field('Nationality',
                    <input value={editForm.nationality} onChange={e => setEditForm(f => ({ ...f, nationality: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </div>

                {field('Notes',
                  <textarea rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                )}

                {edit.isError && <p className="text-sm text-red-500">{String(edit.error)}</p>}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => edit.mutate()} disabled={edit.isPending || !editForm.firstName || !editForm.lastName}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {edit.isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Register Guest</h3>

            <div className="grid grid-cols-2 gap-3">
              {field('First Name *', inp('e.g. John', form.firstName, v => setForm(f => ({ ...f, firstName: v }))))}
              {field('Last Name *', inp('e.g. Smith', form.lastName, v => setForm(f => ({ ...f, lastName: v }))))}
              {field('Middle Name', inp('Optional', form.middleName ?? '', v => setForm(f => ({ ...f, middleName: v || null }))))}
              {field('Nationality', inp('e.g. South African', form.nationality ?? '', v => setForm(f => ({ ...f, nationality: v || null }))))}
              {field('Date of Birth *', inp('', form.dateOfBirth, v => setForm(f => ({ ...f, dateOfBirth: v })), 'date'))}
              {field('Gender', sel(form.gender, GENDERS, v => setForm(f => ({ ...f, gender: v }))))}
              {field('Document Type', sel(form.documentType, DOC_TYPES, v => setForm(f => ({ ...f, documentType: v }))))}
              {field('Document Number *', inp('e.g. A12345678', form.documentNumber, v => setForm(f => ({ ...f, documentNumber: v }))))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact Details</p>
              <div className="grid grid-cols-2 gap-3">
                {field('Phone *', inp('+27 82 000 0000', phone, setPhone, 'tel'))}
                {field('Email', inp('guest@email.com', email, setEmail, 'email'))}
              </div>
              <p className="text-xs text-gray-400">Phone is required. Email is optional.</p>
            </div>

            {register.isError && (
              <p className="text-sm text-red-500">{String(register.error)}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => register.mutate()} disabled={register.isPending || !canSubmit}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {register.isPending ? 'Registering…' : 'Register Guest'}
              </button>
              <button onClick={() => { setShowRegister(false); setForm(emptyForm); setPhone(''); setEmail('') }}
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
