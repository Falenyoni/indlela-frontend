import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReservations, createReservation, confirmReservation, checkInReservation,
  checkOutReservation, cancelReservation, getReservationById,
  type ReservationRow, type CreateReservationRequest,
} from './reservationsApi'
import { getGuests } from '../guests/guestsApi'
import { getProperties } from '../properties/propertiesApi'
import { getItinerary, createItinerary, addItineraryItem, removeItineraryItem, getActivities } from '../activities/activitiesApi'

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  CheckedIn: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  CheckedOut: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  NoShow: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}

const emptyForm: CreateReservationRequest = {
  guestId: '', guestName: '', propertyId: '', propertyName: '',
  checkInDate: '', checkOutDate: '', adults: 1, children: 0, ratePerNight: 0, notes: null,
}

const STATUSES = ['', 'Pending', 'Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled', 'NoShow']

export function ReservationsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateReservationRequest>(emptyForm)
  const [itineraryTitle, setItineraryTitle] = useState('')
  const [addItemForm, setAddItemForm] = useState({ activityId: '', scheduledAt: '', participantCount: '1', notes: '' })

  const { data: reservations = [] } = useQuery({ queryKey: ['reservations', statusFilter], queryFn: () => getReservations(statusFilter || undefined) })
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: getGuests, enabled: showCreate })
  const { data: allProperties = [] } = useQuery({ queryKey: ['properties-all'], queryFn: () => getProperties(), enabled: showCreate })
  const { data: detail, refetch: refetchDetail } = useQuery({ queryKey: ['reservation', detailId], queryFn: () => getReservationById(detailId!), enabled: !!detailId })
  const { data: itinerary, refetch: refetchItinerary } = useQuery({ queryKey: ['itinerary', detailId], queryFn: () => getItinerary(detailId!), enabled: !!detailId })
  const { data: activities = [] } = useQuery({ queryKey: ['activities'], queryFn: getActivities, enabled: !!detailId })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['reservations'] })

  const create = useMutation({
    mutationFn: () => createReservation(form),
    onSuccess: () => { setShowCreate(false); setForm(emptyForm); invalidate() },
  })

  const doAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      if (action === 'confirm') return confirmReservation(id)
      if (action === 'check-in') return checkInReservation(id)
      if (action === 'check-out') return checkOutReservation(id)
      return cancelReservation(id)
    },
    onSuccess: () => { invalidate(); refetchDetail() },
  })

  const createItin = useMutation({
    mutationFn: () => createItinerary(detailId!, itineraryTitle, null),
    onSuccess: () => { refetchItinerary(); setItineraryTitle('') },
  })

  const addItem = useMutation({
    mutationFn: () => addItineraryItem(detailId!, {
      activityId: addItemForm.activityId,
      scheduledAt: new Date(addItemForm.scheduledAt).toISOString(),
      participantCount: Number(addItemForm.participantCount),
      notes: addItemForm.notes || null,
    }),
    onSuccess: () => { refetchItinerary(); setAddItemForm({ activityId: '', scheduledAt: '', participantCount: '1', notes: '' }) },
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) => removeItineraryItem(detailId!, itemId),
    onSuccess: () => refetchItinerary(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reservations</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage guest bookings and check-ins</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Reservation
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>{['Ref', 'Guest', 'Property', 'Check In', 'Check Out', 'Nights', 'Total', 'Status', ''].map(h =>
              <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {reservations.map((r: ReservationRow) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.reservationNumber}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.guestName}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.propertyName}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.checkInDate}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.checkOutDate}</td>
                <td className="px-4 py-3 text-gray-500">{r.totalNights}</td>
                <td className="px-4 py-3 font-medium">R {r.totalAmount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? ''}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setDetailId(r.id)} className="text-xs text-blue-600 hover:underline">View</button>
                </td>
              </tr>
            ))}
            {reservations.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No reservations found</td></tr>}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Reservation</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guest</label>
              <select value={form.guestId} onChange={e => { const g = guests.find(x => x.id === e.target.value); setForm(f => ({ ...f, guestId: e.target.value, guestName: g?.fullName ?? '' })) }}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">Select guest…</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property</label>
              <select value={form.propertyId} onChange={e => { const p = allProperties.find(x => x.id === e.target.value); setForm(f => ({ ...f, propertyId: e.target.value, propertyName: p?.name ?? '', ratePerNight: p?.baseRatePerNight ?? 0 })) }}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">Select property…</option>
                {allProperties.filter(p => p.status === 'Available').map(p => <option key={p.id} value={p.id}>{p.name} ({p.number}) — R {p.baseRatePerNight}/night</option>)}
              </select>
            </div>
            {[
              { label: 'Check-in Date', key: 'checkInDate', type: 'date' },
              { label: 'Check-out Date', key: 'checkOutDate', type: 'date' },
              { label: 'Adults', key: 'adults', type: 'number' },
              { label: 'Children', key: 'children', type: 'number' },
              { label: 'Rate / Night (R)', key: 'ratePerNight', type: 'number' },
              { label: 'Notes', key: 'notes', type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <input type={type} value={(form as Record<string, unknown>)[key] as string ?? ''}
                  onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : (e.target.value || null) }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => create.mutate()} disabled={create.isPending || !form.guestId || !form.propertyId}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {create.isPending ? 'Creating…' : 'Create Reservation'}
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">Cancel</button>
            </div>
            {create.isError && <p className="text-sm text-red-500">{String(create.error)}</p>}
          </div>
        </div>
      )}

      {detailId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{detail.reservationNumber}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[detail.status] ?? ''}`}>{detail.status}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{detail.guestName} · {detail.propertyName}</p>
              </div>
              <button onClick={() => setDetailId(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                ['Check In', detail.checkInDate], ['Check Out', detail.checkOutDate], ['Nights', String(detail.totalNights)],
                ['Adults', String(detail.adults)], ['Children', String(detail.children)], ['Rate/Night', `R ${detail.ratePerNight.toFixed(2)}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Amount</span>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">R {detail.totalAmount.toFixed(2)}</span>
            </div>

            {detail.notes && <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{detail.notes}</p>}

            <div className="flex gap-2 flex-wrap">
              {detail.status === 'Pending' && <button onClick={() => doAction.mutate({ id: detail.id, action: 'confirm' })} disabled={doAction.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Confirm</button>}
              {detail.status === 'Confirmed' && <button onClick={() => doAction.mutate({ id: detail.id, action: 'check-in' })} disabled={doAction.isPending} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">Check In</button>}
              {detail.status === 'CheckedIn' && <button onClick={() => doAction.mutate({ id: detail.id, action: 'check-out' })} disabled={doAction.isPending} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">Check Out</button>}
              {!['CheckedIn', 'CheckedOut', 'Cancelled'].includes(detail.status) && (
                <button onClick={() => doAction.mutate({ id: detail.id, action: 'cancel' })} disabled={doAction.isPending} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">Cancel</button>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Itinerary</h4>
              {!itinerary ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">No itinerary yet.</p>
                  <div className="flex gap-2">
                    <input placeholder="Itinerary title…" value={itineraryTitle} onChange={e => setItineraryTitle(e.target.value)}
                      className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    <button onClick={() => createItin.mutate()} disabled={!itineraryTitle || createItin.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      {createItin.isPending ? '…' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{itinerary.title}</p>
                  {itinerary.items.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-gray-500 text-xs">
                          <tr>{['Activity', 'Date & Time', 'Pax', 'Total', ''].map(h => <th key={h} className="text-left py-1 pr-4 font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {itinerary.items.map(item => (
                            <tr key={item.id}>
                              <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{item.activityName}</td>
                              <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{new Date(item.scheduledAt).toLocaleString()}</td>
                              <td className="py-2 pr-4 text-gray-500">{item.participantCount}</td>
                              <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">R {item.totalPrice.toFixed(2)}</td>
                              <td className="py-2">
                                <button onClick={() => removeItem.mutate(item.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200 dark:border-gray-700 font-semibold">
                            <td colSpan={3} className="pt-2 text-sm text-gray-700 dark:text-gray-300">Activities Total</td>
                            <td className="pt-2 text-sm text-gray-900 dark:text-gray-100">R {itinerary.items.reduce((s, i) => s + i.totalPrice, 0).toFixed(2)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <select value={addItemForm.activityId} onChange={e => setAddItemForm(f => ({ ...f, activityId: e.target.value }))}
                      className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      <option value="">Select activity…</option>
                      {activities.filter(a => a.isActive).map(a => <option key={a.id} value={a.id}>{a.name} — R {a.pricePerPerson}/person</option>)}
                    </select>
                    <input type="datetime-local" value={addItemForm.scheduledAt} onChange={e => setAddItemForm(f => ({ ...f, scheduledAt: e.target.value }))}
                      className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    <input type="number" placeholder="Participants" min={1} value={addItemForm.participantCount} onChange={e => setAddItemForm(f => ({ ...f, participantCount: e.target.value }))}
                      className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    <button onClick={() => addItem.mutate()} disabled={!addItemForm.activityId || !addItemForm.scheduledAt || addItem.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      {addItem.isPending ? 'Adding…' : '+ Add to Itinerary'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
