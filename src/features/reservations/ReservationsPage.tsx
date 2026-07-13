import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReservations, createReservation, getReservationById,
  addLineItem, removeLineItem,
  quoteReservation, confirmReservation, startTrip, completeTrip, cancelReservation,
  type BookingRow, type CreateBookingRequest, type AddLineItemRequest,
} from './reservationsApi'
import { getGuests } from '../guests/guestsApi'
import { getAgents } from '../agents/agentsApi'
import { getLocations } from '../locations/locationsApi'
import { getActivities } from '../activities/activitiesApi'
import { getPropertyTypes } from '../properties/propertiesApi'
import { getTransferRoutes } from '../transport/transfersApi'

const STATUSES = ['', 'Enquiry', 'Quoted', 'Confirmed', 'InProgress', 'Completed', 'Cancelled']

const STATUS_COLORS: Record<string, string> = {
  Enquiry:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Quoted:    'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  InProgress:'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const PRODUCT_TYPES = ['Accommodation', 'Transfer', 'Activity', 'Other']
const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'BWP', 'ZMW', 'KES', 'TZS']

const emptyForm: CreateBookingRequest = {
  guestId: '', guestName: '',
  agentId: null, agentName: null,
  consultantName: '',
  baseLocationId: null, baseLocationName: null,
  travelStartDate: '', travelEndDate: '',
  pax: 1, currency: 'ZAR', exchangeRate: 1,
  reservationistDiscountPercent: 0,
  notes: null,
}

const emptyItem: AddLineItemRequest = {
  productType: 'Accommodation',
  productId: null,
  description: '',
  quantity: 1,
  unit: 'nights',
  rackRate: 0,
  agentDiscountPercent: 0,
  reservationistDiscountPercent: 0,
  costRate: 0,
  childQuantity: 0,
  childRackRate: 0,
  childCostRate: 0,
}

function fmtCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function computeSellingRate(rack: number, agentPct: number, resPct: number) {
  return rack * (1 - agentPct / 100) * (1 - resPct / 100)
}

export function ReservationsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateBookingRequest>(emptyForm)
  const [itemForm, setItemForm] = useState<AddLineItemRequest>(emptyItem)

  const { data: bookings = [] } = useQuery({
    queryKey: ['reservations', statusFilter],
    queryFn: () => getReservations(statusFilter || undefined),
  })

  const { data: guests = [] } = useQuery({
    queryKey: ['guests'],
    queryFn: () => getGuests(),
    enabled: showCreate,
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
    enabled: showCreate,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => getLocations(),
    enabled: showCreate,
  })

  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ['reservation', detailId],
    queryFn: () => getReservationById(detailId!),
    enabled: !!detailId,
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: getActivities,
    enabled: !!detailId,
  })

  const { data: propertyTypes = [] } = useQuery({
    queryKey: ['property-types'],
    queryFn: () => getPropertyTypes(),
    enabled: !!detailId,
  })

  const { data: transferRoutes = [] } = useQuery({
    queryKey: ['transfer-routes'],
    queryFn: () => getTransferRoutes(),
    enabled: !!detailId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['reservations'] })

  const create = useMutation({
    mutationFn: () => createReservation(form),
    onSuccess: () => { setShowCreate(false); setForm(emptyForm); invalidate() },
  })

  const doStatus = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      if (action === 'quote') return quoteReservation(id)
      if (action === 'confirm') return confirmReservation(id)
      if (action === 'start') return startTrip(id)
      if (action === 'complete') return completeTrip(id)
      return cancelReservation(id)
    },
    onSuccess: () => { invalidate(); refetchDetail() },
  })

  const addItem = useMutation({
    mutationFn: () => addLineItem(detailId!, itemForm),
    onSuccess: () => { refetchDetail(); invalidate(); setItemForm(emptyItem) },
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) => removeLineItem(detailId!, itemId),
    onSuccess: () => { refetchDetail(); invalidate() },
  })

  const canCreate = !!form.guestId && !!form.consultantName && !!form.travelStartDate && !!form.travelEndDate
  const canAddItem = !!itemForm.description && itemForm.rackRate > 0 && itemForm.quantity > 0

  const sellingPreview = computeSellingRate(itemForm.rackRate, itemForm.agentDiscountPercent, itemForm.reservationistDiscountPercent)
  const totalPreview = sellingPreview * itemForm.quantity
  const childSellingPreview = computeSellingRate(itemForm.childRackRate, itemForm.agentDiscountPercent, itemForm.reservationistDiscountPercent)
  const childTotalPreview = childSellingPreview * itemForm.childQuantity
  const grandTotalPreview = totalPreview + childTotalPreview

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bookings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tour itineraries and travel bookings</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Booking
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Bookings table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>{['Ref', 'Guest', 'Agent', 'Base Location', 'Dates', 'Pax', 'Total', 'Status', ''].map(h =>
              <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {bookings.map((b: BookingRow) => (
              <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.reservationNumber}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{b.guestName}</td>
                <td className="px-4 py-3 text-gray-500">{b.agentName ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                <td className="px-4 py-3 text-gray-500">{b.baseLocationName ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{b.travelStartDate} → {b.travelEndDate}</td>
                <td className="px-4 py-3 text-gray-500">{b.pax}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{fmtCurrency(b.totalAmount, b.currency)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] ?? ''}`}>{b.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setDetailId(b.id)} className="text-xs text-blue-600 hover:underline">Open</button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Booking Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Booking</h3>

            {/* Guest */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Guest *</label>
              <select value={form.guestId}
                onChange={e => { const g = guests.find(x => x.id === e.target.value); setForm(f => ({ ...f, guestId: e.target.value, guestName: g?.fullName ?? '' })) }}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">Select guest…</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.fullName}</option>)}
              </select>
            </div>

            {/* Agent */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Agent (optional)</label>
              <select value={form.agentId ?? ''}
                onChange={e => { const a = agents.find(x => x.id === e.target.value); setForm(f => ({ ...f, agentId: e.target.value || null, agentName: a?.name ?? null })) }}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">Direct booking (no agent)</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.discountPercent}% discount)</option>)}
              </select>
            </div>

            {/* Consultant */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Consultant *</label>
              <input value={form.consultantName} onChange={e => setForm(f => ({ ...f, consultantName: e.target.value }))}
                placeholder="Name of reservationist / consultant"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>

            {/* Base Location */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Base Location (where group is staying)</label>
              <select value={form.baseLocationId ?? ''}
                onChange={e => { const l = locations.find(x => x.id === e.target.value); setForm(f => ({ ...f, baseLocationId: e.target.value || null, baseLocationName: l?.name ?? null })) }}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">None / transfers only</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
              </select>
            </div>

            {/* Dates + Pax */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date *</label>
                <input type="date" value={form.travelStartDate} onChange={e => setForm(f => ({ ...f, travelStartDate: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End Date *</label>
                <input type="date" value={form.travelEndDate} onChange={e => setForm(f => ({ ...f, travelEndDate: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pax *</label>
                <input type="number" min={1} value={form.pax} onChange={e => setForm(f => ({ ...f, pax: Number(e.target.value) }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
            </div>

            {/* Currency + Exchange Rate + Reservationist Discount */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Exchange Rate</label>
                <input type="number" min={0} step={0.0001} value={form.exchangeRate} onChange={e => setForm(f => ({ ...f, exchangeRate: Number(e.target.value) }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Res. Discount %</label>
                <input type="number" min={0} max={100} step={0.5} value={form.reservationistDiscountPercent}
                  onChange={e => setForm(f => ({ ...f, reservationistDiscountPercent: Number(e.target.value) }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => create.mutate()} disabled={create.isPending || !canCreate}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {create.isPending ? 'Creating…' : 'Create Booking'}
              </button>
              <button onClick={() => { setShowCreate(false); setForm(emptyForm) }}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">
                Cancel
              </button>
            </div>
            {create.isError && <p className="text-sm text-red-500">{String(create.error)}</p>}
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {detailId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-3xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">

            {/* Detail header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{detail.reservationNumber}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[detail.status] ?? ''}`}>{detail.status}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {detail.guestName}
                  {detail.agentName && <> · <span className="text-purple-600 dark:text-purple-400">{detail.agentName}</span></>}
                  {detail.baseLocationName && <> · {detail.baseLocationName}</>}
                </p>
              </div>
              <button onClick={() => setDetailId(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 text-sm">
              {[
                ['Consultant', detail.consultantName],
                ['Travel Dates', `${detail.travelStartDate} → ${detail.travelEndDate}`],
                ['Pax', String(detail.pax)],
                ['Currency', `${detail.currency} (rate: ${detail.exchangeRate})`],
                ...(detail.reservationistDiscountPercent > 0 ? [['Res. Discount', `${detail.reservationistDiscountPercent}%`]] : []),
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">{value}</div>
                </div>
              ))}
            </div>

            {detail.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{detail.notes}</p>
            )}

            {/* Status actions */}
            <div className="flex gap-2 flex-wrap">
              {detail.status === 'Enquiry' && (
                <button onClick={() => doStatus.mutate({ id: detail.id, action: 'quote' })} disabled={doStatus.isPending}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  Send Quote
                </button>
              )}
              {detail.status === 'Quoted' && (
                <button onClick={() => doStatus.mutate({ id: detail.id, action: 'confirm' })} disabled={doStatus.isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  Confirm
                </button>
              )}
              {detail.status === 'Confirmed' && (
                <button onClick={() => doStatus.mutate({ id: detail.id, action: 'start' })} disabled={doStatus.isPending}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  Start Trip
                </button>
              )}
              {detail.status === 'InProgress' && (
                <button onClick={() => doStatus.mutate({ id: detail.id, action: 'complete' })} disabled={doStatus.isPending}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                  Complete
                </button>
              )}
              {detail.status !== 'Completed' && detail.status !== 'Cancelled' && (
                <button onClick={() => doStatus.mutate({ id: detail.id, action: 'cancel' })} disabled={doStatus.isPending}
                  className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                  Cancel
                </button>
              )}
            </div>

            {/* Line Items */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Line Items</h4>

              {detail.lineItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-gray-500 bg-gray-50 dark:bg-gray-800">
                      <tr>{['Type', 'Description', 'Qty', 'Unit', 'Rack', 'Agent%', 'Res%', 'Sell Rate', 'Sell Total', 'Cost Total', ''].map(h =>
                        <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {detail.lineItems.map(item => (
                        <React.Fragment key={item.id}>
                          <tr>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                item.productType === 'Accommodation' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                item.productType === 'Transfer' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                                item.productType === 'Activity' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>{item.productType}</span>
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100 max-w-[180px] truncate">{item.description}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.quantity}</td>
                            <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.rackRate.toFixed(2)}</td>
                            <td className="px-3 py-2 text-gray-500">{item.agentDiscountPercent > 0 ? `${item.agentDiscountPercent}%` : '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{item.reservationistDiscountPercent > 0 ? `${item.reservationistDiscountPercent}%` : '—'}</td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.sellingRate.toFixed(2)}</td>
                            <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">{item.sellingTotal.toFixed(2)}</td>
                            <td className="px-3 py-2 text-gray-500">{item.costTotal.toFixed(2)}</td>
                            <td className="px-3 py-2" rowSpan={item.childQuantity > 0 ? 2 : 1}>
                              <button onClick={() => removeItem.mutate(item.id)}
                                disabled={removeItem.isPending}
                                className="text-red-500 hover:underline disabled:opacity-40">✕</button>
                            </td>
                          </tr>
                          {item.childQuantity > 0 && (
                            <tr className="bg-amber-50/50 dark:bg-amber-900/10">
                              <td className="px-3 py-1.5">
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Child</span>
                              </td>
                              <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-xs italic">{item.childQuantity} child{item.childQuantity !== 1 ? 'ren' : ''}</td>
                              <td className="px-3 py-1.5 text-gray-500 text-xs">{item.childQuantity}</td>
                              <td className="px-3 py-1.5 text-gray-500 text-xs">{item.unit}</td>
                              <td className="px-3 py-1.5 text-gray-500 text-xs">{item.childRackRate.toFixed(2)}</td>
                              <td colSpan={2} />
                              <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-xs">{item.childSellingRate.toFixed(2)}</td>
                              <td className="px-3 py-1.5 font-medium text-gray-700 dark:text-gray-300 text-xs">{item.childSellingTotal.toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-gray-400 text-xs">{item.childCostTotal.toFixed(2)}</td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 dark:border-gray-700 font-semibold text-sm">
                      <tr>
                        <td colSpan={8} className="px-3 pt-2 text-gray-700 dark:text-gray-300 text-right">Total</td>
                        <td className="px-3 pt-2 text-gray-900 dark:text-gray-100">
                          {fmtCurrency(detail.lineItems.reduce((s, i) => s + i.sellingTotal + i.childSellingTotal, 0), detail.currency)}
                        </td>
                        <td className="px-3 pt-2 text-gray-500 text-xs">
                          Cost: {detail.lineItems.reduce((s, i) => s + i.costTotal + i.childCostTotal, 0).toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No line items yet. Add products below.</p>
              )}

              {/* Add line item form */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Add Line Item</p>

                {/* Type selector — drives the product dropdown below */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select value={itemForm.productType}
                    onChange={e => {
                      const t = e.target.value
                      const defaultUnit = t === 'Accommodation' ? 'nights' : t === 'Activity' ? 'pax' : t === 'Transfer' ? 'trips' : ''
                      setItemForm(f => ({ ...f, productType: t, productId: null, description: '', rackRate: 0, unit: defaultUnit }))
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Product picker — shown for Accommodation and Activity */}
                {itemForm.productType === 'Accommodation' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Property Type</label>
                    <select value={itemForm.productId ?? ''}
                      onChange={e => {
                        const pt = propertyTypes.find(x => x.id === e.target.value)
                        setItemForm(f => ({
                          ...f,
                          productId: e.target.value || null,
                          description: pt ? pt.name : f.description,
                          rackRate: pt ? pt.baseRatePerNight : f.rackRate,
                          unit: 'nights',
                        }))
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      <option value="">Select property type…</option>
                      {propertyTypes.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id}>{p.name} — {detail!.currency} {p.baseRatePerNight.toFixed(2)}/night</option>
                      ))}
                    </select>
                  </div>
                )}

                {itemForm.productType === 'Activity' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Activity</label>
                    <select value={itemForm.productId ?? ''}
                      onChange={e => {
                        const a = activities.find(x => x.id === e.target.value)
                        setItemForm(f => ({
                          ...f,
                          productId: e.target.value || null,
                          description: a ? a.name : f.description,
                          rackRate: a ? a.pricePerPerson : f.rackRate,
                          unit: 'pax',
                        }))
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      <option value="">Select activity…</option>
                      {activities.filter(a => a.isActive).map(a => (
                        <option key={a.id} value={a.id}>{a.name} — {detail!.currency} {a.pricePerPerson.toFixed(2)}/pax</option>
                      ))}
                    </select>
                  </div>
                )}

                {itemForm.productType === 'Transfer' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Transfer Route</label>
                    <select value={itemForm.productId ?? ''}
                      onChange={e => {
                        const r = transferRoutes.find(x => x.id === e.target.value)
                        setItemForm(f => ({
                          ...f,
                          productId: e.target.value || null,
                          description: r ? `${r.pickupLocationName} → ${r.dropoffLocationName} (${r.vehicleType})` : f.description,
                          rackRate: r ? r.rackRate : f.rackRate,
                          costRate: r ? r.costRate : f.costRate,
                          unit: 'trips',
                        }))
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      <option value="">Select transfer route…</option>
                      {transferRoutes.filter(r => r.isActive).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.pickupLocationName} → {r.dropoffLocationName} ({r.vehicleType}, max {r.maxPassengers} pax) — {detail!.currency} {r.rackRate.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Description — editable override */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description *</label>
                  <input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={itemForm.productType === 'Transfer' ? 'e.g. Airport → Victoria Falls Hotel' : 'e.g. Luxury Suite — 3 nights'}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Qty *</label>
                    <input type="number" min={0.01} step={0.01} value={itemForm.quantity}
                      onChange={e => setItemForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unit</label>
                    <input list="units-list" value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    <datalist id="units-list">
                      {['nights', 'pax', 'trips', 'days', 'units'].map(u => <option key={u} value={u} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Rack Rate *</label>
                    <input type="number" min={0} step={0.01} value={itemForm.rackRate}
                      onChange={e => setItemForm(f => ({ ...f, rackRate: Number(e.target.value) }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cost Rate</label>
                    <input type="number" min={0} step={0.01} value={itemForm.costRate}
                      onChange={e => setItemForm(f => ({ ...f, costRate: Number(e.target.value) }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Agent Discount %</label>
                    <input type="number" min={0} max={100} step={0.5} value={itemForm.agentDiscountPercent}
                      onChange={e => setItemForm(f => ({ ...f, agentDiscountPercent: Number(e.target.value) }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Res. Discount %</label>
                    <input type="number" min={0} max={100} step={0.5} value={itemForm.reservationistDiscountPercent}
                      onChange={e => setItemForm(f => ({ ...f, reservationistDiscountPercent: Number(e.target.value) }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>

                {/* Child pax */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Child Pax (optional)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Child Qty</label>
                      <input type="number" min={0} value={itemForm.childQuantity}
                        onChange={e => setItemForm(f => ({ ...f, childQuantity: Number(e.target.value) }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Child Rack Rate</label>
                      <input type="number" min={0} step={0.01} value={itemForm.childRackRate}
                        onChange={e => setItemForm(f => ({ ...f, childRackRate: Number(e.target.value) }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Child Cost Rate</label>
                      <input type="number" min={0} step={0.01} value={itemForm.childCostRate}
                        onChange={e => setItemForm(f => ({ ...f, childCostRate: Number(e.target.value) }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    </div>
                  </div>
                </div>

                {/* Price preview */}
                {itemForm.rackRate > 0 && itemForm.quantity > 0 && (
                  <div className="space-y-1 text-xs text-gray-500 bg-white dark:bg-gray-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-4">
                      <span>Adults ({itemForm.quantity}): Rack <strong className="text-gray-700 dark:text-gray-300">{itemForm.rackRate.toFixed(2)}</strong></span>
                      <span>→</span>
                      <span>Sell/unit <strong className="text-blue-600 dark:text-blue-400">{sellingPreview.toFixed(2)}</strong></span>
                      <span>→</span>
                      <span>Total <strong className="text-green-600 dark:text-green-400">{totalPreview.toFixed(2)}</strong></span>
                    </div>
                    {itemForm.childQuantity > 0 && itemForm.childRackRate > 0 && (
                      <div className="flex items-center gap-4">
                        <span>Children ({itemForm.childQuantity}): Rack <strong className="text-gray-700 dark:text-gray-300">{itemForm.childRackRate.toFixed(2)}</strong></span>
                        <span>→</span>
                        <span>Sell/unit <strong className="text-blue-600 dark:text-blue-400">{childSellingPreview.toFixed(2)}</strong></span>
                        <span>→</span>
                        <span>Total <strong className="text-green-600 dark:text-green-400">{childTotalPreview.toFixed(2)}</strong></span>
                      </div>
                    )}
                    {(itemForm.childQuantity > 0 && itemForm.childRackRate > 0) && (
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700 font-medium">
                        <span>Grand Total: <strong className="text-green-700 dark:text-green-400">{grandTotalPreview.toFixed(2)}</strong></span>
                        {(itemForm.costRate > 0 || itemForm.childCostRate > 0) && (
                          <span>· Margin: <strong className="text-teal-600">{(grandTotalPreview - itemForm.costRate * itemForm.quantity - itemForm.childCostRate * itemForm.childQuantity).toFixed(2)}</strong></span>
                        )}
                      </div>
                    )}
                    {itemForm.childQuantity === 0 && itemForm.costRate > 0 && (
                      <span className="ml-4">· Margin: <strong className="text-teal-600">{(totalPreview - itemForm.costRate * itemForm.quantity).toFixed(2)}</strong></span>
                    )}
                  </div>
                )}

                <button onClick={() => addItem.mutate()} disabled={addItem.isPending || !canAddItem}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {addItem.isPending ? 'Adding…' : '+ Add to Booking'}
                </button>
                {addItem.isError && <p className="text-xs text-red-500">{String(addItem.error)}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
