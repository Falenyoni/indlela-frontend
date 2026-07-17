import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ReservationImportModal } from './ReservationImportModal'
import {
  getReservations, createReservation, getReservationById,
  addLineItem, removeLineItem, recordPayment, updateLineItemDiscount,
  getDiscountRequests, requestDiscount, reviewDiscountRequest,
  quoteReservation, confirmReservation, startTrip, completeTrip, cancelReservation,
  getConsultants,
  type BookingRow, type CreateBookingRequest, type AddLineItemRequest, type RecordPaymentRequest, type DiscountRequestDto,
} from './reservationsApi'
import { getGuests } from '../guests/guestsApi'
import { getAgents } from '../agents/agentsApi'
import { getLocations } from '../locations/locationsApi'
import { getActivities } from '../activities/activitiesApi'
import { getPropertyTypes } from '../properties/propertiesApi'
import { useAuth } from '@/shared/lib/auth/AuthContext'
import { Permissions } from '@/shared/lib/auth/permissions'

const STATUSES = ['', 'Enquiry', 'Quoted', 'Confirmed', 'InProgress', 'Completed', 'Cancelled']

type DatePeriod = '' | 'today' | 'week' | 'month' | 'year' | 'custom'
const DATE_PERIODS: { value: DatePeriod; label: string }[] = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom…' },
]

function getPeriodRange(period: DatePeriod): { from: string; to: string } | null {
  if (!period || period === 'custom') return null
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (period === 'today') {
    const t = fmt(now)
    return { from: t, to: t }
  }
  if (period === 'week') {
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
    const mon = new Date(now); mon.setDate(now.getDate() - day)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { from: fmt(mon), to: fmt(sun) }
  }
  if (period === 'month') {
    const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from, to: fmt(last) }
  }
  // year
  return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` }
}

const STATUS_COLORS: Record<string, string> = {
  Enquiry:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Quoted:     'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Confirmed:  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  InProgress: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Completed:  'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  Cancelled:  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const PT_COLORS: Record<string, string> = {
  Accommodation: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Transfer:      'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Activity:      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  ParkFee:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  Helicopter:    'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  Other:         'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const PH_COLORS: Record<string, string> = {
  ThroughDMC:     'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  GuestPaysDirect:'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  ThroughAgent:   'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
}
const PH_LABELS: Record<string, string> = {
  ThroughDMC: 'Through DMC',
  GuestPaysDirect: 'Guest pays direct',
  ThroughAgent: 'Through agent',
}

const PM_LABELS: Record<string, string> = {
  AgentCredit: 'Agent Credit',
  BankTransfer: 'Bank Transfer',
}
const pmLabel = (m: string) => PM_LABELS[m] ?? m

const PRODUCT_TYPES = ['Accommodation', 'Transfer', 'Activity', 'ParkFee', 'Helicopter', 'Other']
const PT_LABELS: Record<string, string> = { ParkFee: 'Park Fee' }
const ptLabel = (t: string) => PT_LABELS[t] ?? t

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'BWP', 'ZMW', 'KES', 'TZS']
const BOOKING_SOURCES = ['WalkIn', 'Agent', 'Email', 'Web']
const PAYMENT_METHODS = ['Cash', 'Card', 'EFT', 'AgentCredit', 'BankTransfer']

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-xs text-gray-500 mb-1'

const emptyForm: CreateBookingRequest = {
  guestId: '', guestName: '',
  agentId: null, agentName: null,
  consultantId: '', consultantName: '',
  baseLocationId: null,
  travelStartDate: '', travelEndDate: '',
  adultPax: 1, childPax: 0, compAdultPax: 0, compChildPax: 0,
  notes: null, bookingSource: 'WalkIn',
  paymentHandling: 'ThroughDMC',
}

const emptyItem: AddLineItemRequest = {
  productType: 'Accommodation',
  productId: null,
  description: '',
  quantity: 1,
  unit: 'nights',
  rackRate: 0,
  costRate: 0,
  childQuantity: 0,
  childRackRate: 0,
  childCostRate: 0,
  compAdultQuantity: 0,
  compAdultCostRate: 0,
  compChildQuantity: 0,
  compChildCostRate: 0,
  serviceDate: null,
  startTime: null,
  meetingPoint: null,
  notes: null,
}

const emptyPayment = (detail?: { currency?: string; exchangeRate?: number; reservationistDiscountPercent?: number }): RecordPaymentRequest => ({
  bookingId: '',
  amount: 0,
  currency: detail?.currency ?? 'USD',
  exchangeRate: detail?.exchangeRate ?? 1,
  reservationistDiscountPercent: detail?.reservationistDiscountPercent ?? 0,
  paymentMethod: 'Cash',
  paidAt: new Date().toISOString().slice(0, 10),
  reference: null,
  notes: null,
})

function fmtCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function computeSellingRate(rack: number, resPct: number) {
  return rack * (1 - resPct / 100)
}

function fmtTime(t: string | null) {
  if (!t) return null
  return t.slice(0, 5)
}

export function ReservationsPage() {
  const qc = useQueryClient()
  const { user, hasPermission } = useAuth()
  const isSupervisorOrAbove = hasPermission(Permissions.Bookings.ViewAll)
  const isConsultant = hasPermission(Permissions.Bookings.ViewOwn) && !isSupervisorOrAbove

  const [statusFilter, setStatusFilter] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateBookingRequest>({
    ...emptyForm,
    consultantId: isConsultant ? (user?.userId ?? '') : '',
    consultantName: isConsultant ? (user?.fullName ?? '') : '',
  })
  const [itemForm, setItemForm] = useState<AddLineItemRequest>(emptyItem)
  const [paymentForm, setPaymentForm] = useState<RecordPaymentRequest>(emptyPayment())
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [discountEdits, setDiscountEdits] = useState<Record<string, string>>({})
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())
  const [discountReqForm, setDiscountReqForm] = useState<{ itemId: string; percent: number; reason: string } | null>(null)
  const canApproveDiscount = hasPermission(Permissions.Discounts.Approve)
  const canRequestDiscount = hasPermission(Permissions.Discounts.Request)

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
    enabled: showCreate || showAddItem,
  })

  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ['reservation', detailId],
    queryFn: () => getReservationById(detailId!),
    enabled: !!detailId,
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => getActivities(),
    enabled: !!detailId,
  })

  const { data: parkFeeActivities = [] } = useQuery({
    queryKey: ['activities', 'ParkFee'],
    queryFn: () => getActivities('ParkFee'),
    enabled: !!detailId && itemForm.productType === 'ParkFee',
  })

  const { data: helicopterActivities = [] } = useQuery({
    queryKey: ['activities', 'Helicopter'],
    queryFn: () => getActivities('Helicopter'),
    enabled: !!detailId && itemForm.productType === 'Helicopter',
  })

  const { data: propertyTypes = [] } = useQuery({
    queryKey: ['property-types'],
    queryFn: () => getPropertyTypes(),
    enabled: !!detailId,
  })

  const { data: transferActivities = [] } = useQuery({
    queryKey: ['activities', 'Transfer'],
    queryFn: () => getActivities('Transfer'),
    enabled: !!detailId && itemForm.productType === 'Transfer',
  })


  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants'],
    queryFn: getConsultants,
    enabled: showCreate && isSupervisorOrAbove,
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
    onSuccess: () => { refetchDetail(); invalidate(); setItemForm(emptyItem); setShowAddItem(false) },
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) => removeLineItem(detailId!, itemId),
    onSuccess: () => { refetchDetail(); invalidate() },
  })

  const saveDiscount = useMutation({
    mutationFn: ({ itemId, pct }: { itemId: string; pct: number }) =>
      updateLineItemDiscount(detailId!, itemId, pct),
    onSuccess: () => { refetchDetail(); invalidate() },
  })

  const { data: discountRequests = [], refetch: refetchDiscountRequests } = useQuery({
    queryKey: ['discount-requests', detailId],
    queryFn: () => getDiscountRequests(detailId!),
    enabled: !!detailId,
  })

  const submitDiscountReq = useMutation({
    mutationFn: ({ itemId, percent, reason }: { itemId: string; percent: number; reason: string }) =>
      requestDiscount(detailId!, itemId, percent, reason),
    onSuccess: () => { setDiscountReqForm(null); refetchDiscountRequests() },
  })

  const reviewDiscount = useMutation({
    mutationFn: ({ reqId, approved, note }: { reqId: string; approved: boolean; note?: string }) =>
      reviewDiscountRequest(reqId, approved, note),
    onSuccess: () => { refetchDetail(); refetchDiscountRequests(); invalidate() },
  })

  const pendingByItemId = Object.fromEntries(
    discountRequests.filter(r => r.status === 'Pending' && r.lineItemId).map(r => [r.lineItemId!, r])
  ) as Record<string, DiscountRequestDto>

  const toggleCollapse = (itemId: string) =>
    setCollapsedItems(s => { const n = new Set(s); n.has(itemId) ? n.delete(itemId) : n.add(itemId); return n })

  const addPayment = useMutation({
    mutationFn: () => recordPayment(detailId!, { ...paymentForm, bookingId: detailId! }),
    onSuccess: () => { refetchDetail(); invalidate(); setPaymentForm(emptyPayment(detail ?? undefined)); setShowAddPayment(false) },
  })

  const openDetail = (id: string) => {
    setDetailId(id)
    setItemForm(emptyItem)
    setPaymentForm(emptyPayment())
    setShowAddItem(false)
    setShowAddPayment(false)
  }

  const canCreate = !!form.guestId && !!form.consultantId && !!form.travelStartDate && !!form.travelEndDate
  const canAddItem = !!itemForm.description && itemForm.rackRate > 0 && itemForm.quantity > 0
  const canAddPayment = paymentForm.amount > 0 && !!paymentForm.paidAt

  const periodRange = datePeriod === 'custom'
    ? (customFrom && customTo ? { from: customFrom, to: customTo } : null)
    : getPeriodRange(datePeriod)

  const filteredBookings = periodRange
    ? bookings.filter((b: BookingRow) => b.travelStartDate <= periodRange.to && b.travelEndDate >= periodRange.from)
    : bookings

  const sellingPreview = computeSellingRate(itemForm.rackRate, 0)
  const totalPreview = sellingPreview * itemForm.quantity
  const childSellingPreview = computeSellingRate(itemForm.childRackRate, 0)
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
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
            ↑ Import
          </button>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Booking
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>

        <select value={datePeriod} onChange={e => setDatePeriod(e.target.value as DatePeriod)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {DATE_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {datePeriod === 'custom' && (<>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </>)}

        {periodRange && (
          <span className="text-xs text-gray-400">
            {filteredBookings.length} of {bookings.length}
          </span>
        )}
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
            {filteredBookings.map((b: BookingRow) => (
              <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.reservationNumber}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{b.guestName}</td>
                <td className="px-4 py-3 text-gray-500">{b.agentName ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                <td className="px-4 py-3 text-gray-500">{b.baseLocationName ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{b.travelStartDate} → {b.travelEndDate}</td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  <span>{b.adultPax}A</span>
                  {b.childPax > 0 && <span className="ml-1 text-amber-600">{b.childPax}C</span>}
                  {b.compAdultPax > 0 && <span className="ml-1 text-purple-600">{b.compAdultPax}CA</span>}
                  {b.compChildPax > 0 && <span className="ml-1 text-purple-600">{b.compChildPax}CC</span>}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{fmtCurrency(b.totalAmount, b.currency)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] ?? ''}`}>{b.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openDetail(b.id)} className="text-xs text-blue-600 hover:underline">Open</button>
                </td>
              </tr>
            ))}
            {filteredBookings.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showImport && <ReservationImportModal onClose={() => setShowImport(false)} />}

      {/* Create Booking Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Booking</h3>

            <div>
              <label className={labelCls}>Guest *</label>
              <select value={form.guestId}
                onChange={e => { const g = guests.find(x => x.id === e.target.value); setForm(f => ({ ...f, guestId: e.target.value, guestName: g?.fullName ?? '' })) }}
                className={inputCls}>
                <option value="">Select guest…</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.fullName}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Agent (optional)</label>
              <select value={form.agentId ?? ''}
                onChange={e => { const a = agents.find(x => x.id === e.target.value); setForm(f => ({ ...f, agentId: e.target.value || null, agentName: a?.name ?? null })) }}
                className={inputCls}>
                <option value="">Direct booking (no agent)</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Consultant *</label>
              {isConsultant ? (
                <input value={form.consultantName} readOnly
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed" />
              ) : (
                <select value={form.consultantId}
                  onChange={e => { const c = consultants.find(x => x.id === e.target.value); setForm(f => ({ ...f, consultantId: e.target.value, consultantName: c?.fullName ?? '' })) }}
                  className={inputCls}>
                  <option value="">Select consultant…</option>
                  {consultants.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Booking Source</label>
                <select value={form.bookingSource} onChange={e => setForm(f => ({ ...f, bookingSource: e.target.value }))} className={inputCls}>
                  {BOOKING_SOURCES.map(s => <option key={s} value={s}>{s === 'WalkIn' ? 'Walk-in' : s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Handling</label>
                <select value={form.paymentHandling} onChange={e => setForm(f => ({ ...f, paymentHandling: e.target.value }))} className={inputCls}>
                  <option value="ThroughDMC">Through DMC (invoiced)</option>
                  <option value="GuestPaysDirect">Guest Pays Direct</option>
                  <option value="ThroughAgent">Through Agent</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Base Location</label>
              <select value={form.baseLocationId ?? ''}
                onChange={e => setForm(f => ({ ...f, baseLocationId: e.target.value || null }))}
                className={inputCls}>
                <option value="">None</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelCls}>Start Date *</label>
                <input type="date" value={form.travelStartDate} onChange={e => setForm(f => ({ ...f, travelStartDate: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>End Date *</label>
                <input type="date" value={form.travelEndDate} onChange={e => setForm(f => ({ ...f, travelEndDate: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Adults *</label>
                <input type="number" min={1} value={form.adultPax} onChange={e => setForm(f => ({ ...f, adultPax: Number(e.target.value) }))} className={inputCls} /></div>
              <div><label className={labelCls}>Children</label>
                <input type="number" min={0} value={form.childPax} onChange={e => setForm(f => ({ ...f, childPax: Number(e.target.value) }))} className={inputCls} /></div>
              <div><label className={labelCls}>Comp Adults</label>
                <input type="number" min={0} value={form.compAdultPax} onChange={e => setForm(f => ({ ...f, compAdultPax: Number(e.target.value) }))} className={inputCls} /></div>
              <div><label className={labelCls}>Comp Children</label>
                <input type="number" min={0} value={form.compChildPax} onChange={e => setForm(f => ({ ...f, compChildPax: Number(e.target.value) }))} className={inputCls} /></div>
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <textarea rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))}
                className={inputCls + ' resize-none'} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => create.mutate()} disabled={create.isPending || !canCreate}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {create.isPending ? 'Creating…' : 'Create Booking'}
              </button>
              <button onClick={() => { setShowCreate(false); setForm(emptyForm) }}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">
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
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">

            {/* Header */}
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
                ['Pax', [detail.adultPax + 'A', detail.childPax > 0 ? detail.childPax + 'C' : '', detail.compAdultPax > 0 ? detail.compAdultPax + ' Comp Adult' : '', detail.compChildPax > 0 ? detail.compChildPax + ' Comp Child' : ''].filter(Boolean).join(' · ')],
                ['Currency', `${detail.currency} (rate: ${detail.exchangeRate})`],
                ...(detail.reservationistDiscountPercent > 0 ? [['Res. Discount', `${detail.reservationistDiscountPercent}%`]] : []),
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">{value}</div>
                </div>
              ))}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Payment Handling</div>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PH_COLORS[detail.paymentHandling] ?? ''}`}>
                  {PH_LABELS[detail.paymentHandling] ?? detail.paymentHandling}
                </span>
              </div>
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

            {/* ── ITINERARY / LINE ITEMS ── */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Itinerary</h4>
                {detail.status !== 'Completed' && detail.status !== 'Cancelled' && (
                  <button onClick={() => setShowAddItem(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                    + Add Item
                  </button>
                )}
              </div>

              {detail.lineItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-gray-500 bg-gray-50 dark:bg-gray-800">
                      <tr>{['Type', 'Description / Schedule', 'Qty', 'Rack', 'Disc %', 'Sell Rate', 'Sell Total', 'Cost', ''].map(h =>
                        <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {detail.lineItems.map(item => {
                        const isCollapsed = collapsedItems.has(item.id)
                        const hasChildren = item.childQuantity > 0 || item.compAdultQuantity > 0 || item.compChildQuantity > 0
                        const pending = pendingByItemId[item.id]
                        return (
                        <React.Fragment key={item.id}>
                          <tr className={detail.paymentHandling === 'GuestPaysDirect' ? 'opacity-60' : ''}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {hasChildren && (
                                  <button onClick={() => toggleCollapse(item.id)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs leading-none w-4 shrink-0">
                                    {isCollapsed ? '▶' : '▼'}
                                  </button>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PT_COLORS[item.productType] ?? PT_COLORS.Other}`}>
                                  {ptLabel(item.productType)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 max-w-[220px]">
                              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.description}</div>
                              {/* Schedule line */}
                              {(item.serviceDate || item.startTime || item.meetingPoint) && (
                                <div className="text-gray-400 mt-0.5 space-x-1">
                                  {item.serviceDate && <span>{item.serviceDate}</span>}
                                  {item.startTime && <span>· {fmtTime(item.startTime)}{item.sessionName ? ` (${item.sessionName})` : ''}</span>}
                                  {item.meetingPoint && <span>· {item.meetingPoint}</span>}
                                </div>
                              )}
                              {item.notes && <div className="text-gray-400 italic truncate">{item.notes}</div>}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-gray-500">{item.rackRate.toFixed(2)}</td>
                            <td className="px-3 py-2">
                              {canApproveDiscount ? (
                                <input
                                  type="number" min={0} max={100} step={0.5}
                                  value={discountEdits[item.id] ?? item.reservationistDiscountPercent.toFixed(1)}
                                  onChange={e => setDiscountEdits(d => ({ ...d, [item.id]: e.target.value }))}
                                  onBlur={e => {
                                    const pct = parseFloat(e.target.value)
                                    if (!isNaN(pct) && pct !== item.reservationistDiscountPercent) {
                                      saveDiscount.mutate({ itemId: item.id, pct })
                                    }
                                    setDiscountEdits(d => { const n = { ...d }; delete n[item.id]; return n })
                                  }}
                                  className="w-14 text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                />
                              ) : pending ? (
                                <span className="text-xs text-amber-500 whitespace-nowrap" title={`${pending.requestedDiscountPercent}% — awaiting approval`}>
                                  ⏳ {pending.requestedDiscountPercent}%
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">{item.reservationistDiscountPercent.toFixed(1)}%</span>
                                  {canRequestDiscount && (
                                    <button onClick={() => setDiscountReqForm({ itemId: item.id, percent: item.reservationistDiscountPercent, reason: '' })}
                                      className="text-xs text-blue-500 hover:underline ml-1">req</button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.sellingRate.toFixed(2)}</td>
                            <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                              {detail.paymentHandling === 'GuestPaysDirect'
                                ? <span className="text-amber-600 dark:text-amber-400 font-normal italic">Guest pays</span>
                                : item.sellingTotal.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-gray-400">{item.costTotal.toFixed(2)}</td>
                            <td className="px-3 py-2" rowSpan={1 + (item.childQuantity > 0 ? 1 : 0) + (item.compAdultQuantity > 0 ? 1 : 0) + (item.compChildQuantity > 0 ? 1 : 0)}>
                              <button onClick={() => removeItem.mutate(item.id)} disabled={removeItem.isPending}
                                className="text-red-500 hover:underline disabled:opacity-40">✕</button>
                            </td>
                          </tr>
                          {item.childQuantity > 0 && !isCollapsed && (
                            <tr className="bg-amber-50/50 dark:bg-amber-900/10">
                              <td className="px-3 py-1.5">
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Child</span>
                              </td>
                              <td className="px-3 py-1.5 text-gray-500 italic">{item.childQuantity} child{item.childQuantity !== 1 ? 'ren' : ''}</td>
                              <td className="px-3 py-1.5 text-gray-500">{item.childQuantity} {item.unit}</td>
                              <td className="px-3 py-1.5 text-gray-400">{item.childRackRate.toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-gray-400">—</td>
                              <td className="px-3 py-1.5 text-gray-500">{item.childSellingRate.toFixed(2)}</td>
                              <td className="px-3 py-1.5 font-medium text-gray-700 dark:text-gray-300">{item.childSellingTotal.toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-gray-400">{item.childCostTotal.toFixed(2)}</td>
                            </tr>
                          )}
                          {item.compAdultQuantity > 0 && !isCollapsed && (
                            <tr className="bg-purple-50/50 dark:bg-purple-900/10">
                              <td className="px-3 py-1.5">
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Comp Adult</span>
                              </td>
                              <td className="px-3 py-1.5 text-gray-500 italic">{item.compAdultQuantity} complimentary</td>
                              <td className="px-3 py-1.5 text-gray-500">{item.compAdultQuantity} {item.unit}</td>
                              <td className="px-3 py-1.5 text-gray-400">—</td>
                              <td className="px-3 py-1.5 text-gray-400">—</td>
                              <td className="px-3 py-1.5 text-gray-400">—</td>
                              <td className="px-3 py-1.5 text-purple-600 dark:text-purple-400 font-medium">No charge</td>
                              <td className="px-3 py-1.5 text-gray-400">{item.compAdultCostTotal > 0 ? item.compAdultCostTotal.toFixed(2) : '—'}</td>
                            </tr>
                          )}
                          {item.compChildQuantity > 0 && !isCollapsed && (
                            <tr className="bg-purple-50/30 dark:bg-purple-900/5">
                              <td className="px-3 py-1.5">
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Comp Child</span>
                              </td>
                              <td className="px-3 py-1.5 text-gray-500 italic">{item.compChildQuantity} complimentary</td>
                              <td className="px-3 py-1.5 text-gray-500">{item.compChildQuantity} {item.unit}</td>
                              <td className="px-3 py-1.5 text-gray-400">—</td>
                              <td className="px-3 py-1.5 text-gray-400">—</td>
                              <td className="px-3 py-1.5 text-gray-400">—</td>
                              <td className="px-3 py-1.5 text-purple-600 dark:text-purple-400 font-medium">No charge</td>
                              <td className="px-3 py-1.5 text-gray-400">{item.compChildCostTotal > 0 ? item.compChildCostTotal.toFixed(2) : '—'}</td>
                            </tr>
                          )}
                        </React.Fragment>
                        )
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 dark:border-gray-700 text-sm">
                      <tr>
                        <td colSpan={5} className="px-3 pt-2 text-right text-gray-600 dark:text-gray-400">Invoice Total</td>
                        <td className="px-3 pt-2 font-bold text-gray-900 dark:text-gray-100">{fmtCurrency(detail.totalAmount, detail.currency)}</td>
                        <td className="px-3 pt-2 text-gray-400 text-xs">
                          Cost: {detail.lineItems.reduce((s, i) => s + i.costTotal + i.childCostTotal + i.compAdultCostTotal + i.compChildCostTotal, 0).toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No items yet.</p>
              )}

            </div>

            {/* ── DISCOUNT REQUESTS ── */}
            {canApproveDiscount && discountRequests.filter(r => r.status === 'Pending').length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Discount Requests
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    {discountRequests.filter(r => r.status === 'Pending').length} pending
                  </span>
                </h4>
                {discountRequests.filter(r => r.status === 'Pending').map(req => (
                  <div key={req.id} className="flex items-start justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-sm">
                    <div className="space-y-0.5">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {req.requestedDiscountPercent}% discount requested by {req.requestedByName}
                      </p>
                      <p className="text-xs text-gray-500 italic">{req.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => reviewDiscount.mutate({ reqId: req.id, approved: true })}
                        disabled={reviewDiscount.isPending}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                        Approve
                      </button>
                      <button onClick={() => reviewDiscount.mutate({ reqId: req.id, approved: false })}
                        disabled={reviewDiscount.isPending}
                        className="px-2 py-1 border border-red-300 text-red-600 rounded text-xs font-medium hover:bg-red-50 disabled:opacity-50">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── PAYMENTS ── */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Payments</h4>
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="text-gray-500">Invoice: <span className="font-medium text-gray-900 dark:text-gray-100">{fmtCurrency(detail.totalAmount, detail.currency)}</span></span>
                  <span className={detail.outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    Outstanding: <span className="font-semibold">{fmtCurrency(detail.outstandingBalance, detail.currency)}</span>
                  </span>
                  {detail.status !== 'Cancelled' && (
                    <button onClick={() => { setPaymentForm(emptyPayment(detail)); setShowAddPayment(true) }}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                      + Record Payment
                    </button>
                  )}
                </div>
              </div>

              {detail.payments.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-gray-500 bg-gray-50 dark:bg-gray-800">
                      <tr>{['Method', 'Amount', 'Date', 'Reference', 'Collected by'].map(h =>
                        <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {detail.payments.map(p => (
                        <tr key={p.id}>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">{pmLabel(p.paymentMethod)}</span>
                          </td>
                          <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">{fmtCurrency(p.amount, p.currency)}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(p.paidAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="px-3 py-2 text-gray-400">{p.reference ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-400">{p.collectedByName}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 dark:border-gray-700">
                      <tr>
                        <td className="px-3 pt-2 text-xs text-gray-500 font-medium">Total paid</td>
                        <td className="px-3 pt-2 font-bold text-green-700 dark:text-green-400">
                          {fmtCurrency(detail.payments.reduce((s, p) => s + p.amount, 0), detail.currency)}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ── REQUEST DISCOUNT MODAL ── */}
      {discountReqForm && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Request Discount</h3>
            <div>
              <label className={labelCls}>Discount %</label>
              <input type="number" min={0} max={100} step={0.5}
                value={discountReqForm.percent}
                onChange={e => setDiscountReqForm(f => f && ({ ...f, percent: Number(e.target.value) }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Reason *</label>
              <input value={discountReqForm.reason}
                onChange={e => setDiscountReqForm(f => f && ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Repeat guest, agent request…"
                className={inputCls} />
            </div>
            {submitDiscountReq.isError && (
              <p className="text-xs text-red-500">{String(submitDiscountReq.error)}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDiscountReqForm(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button
                onClick={() => submitDiscountReq.mutate({ itemId: discountReqForm.itemId, percent: discountReqForm.percent, reason: discountReqForm.reason })}
                disabled={submitDiscountReq.isPending || !discountReqForm.reason.trim() || discountReqForm.percent <= 0}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {submitDiscountReq.isPending ? 'Sending…' : 'Send for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD ITEM MODAL ── */}
      {showAddItem && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Add Item</h3>
                <p className="text-xs text-gray-500 mt-0.5">{detail.reservationNumber} · {detail.guestName}</p>
              </div>
              <button onClick={() => { setShowAddItem(false); setItemForm(emptyItem) }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Type</label>
                <select value={itemForm.productType}
                  onChange={e => {
                    const t = e.target.value
                    const defaultUnit = t === 'Accommodation' ? 'nights' : 'pax'
                    setItemForm(f => ({ ...f, productType: t, productId: null, description: '', rackRate: 0, childRackRate: 0, unit: defaultUnit }))
                  }}
                  className={inputCls}>
                  {PRODUCT_TYPES.map(t => <option key={t} value={t}>{ptLabel(t)}</option>)}
                </select>
              </div>

              {itemForm.productType === 'Accommodation' && (
                <div>
                  <label className={labelCls}>Property Type</label>
                  <select value={itemForm.productId ?? ''}
                    onChange={e => {
                      const pt = propertyTypes.find(x => x.id === e.target.value)
                      setItemForm(f => ({ ...f, productId: e.target.value || null, description: pt ? pt.name : f.description, rackRate: pt ? pt.baseRatePerNight : f.rackRate, unit: 'nights' }))
                    }}
                    className={inputCls}>
                    <option value="">Select…</option>
                    {propertyTypes.filter(p => p.isActive).map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {detail.currency} {p.baseRatePerNight.toFixed(2)}/night</option>
                    ))}
                  </select>
                </div>
              )}
              {itemForm.productType === 'Activity' && (
                <div>
                  <label className={labelCls}>Activity</label>
                  <select value={itemForm.productId ?? ''}
                    onChange={e => {
                      const a = activities.find(x => x.id === e.target.value)
                      setItemForm(f => ({ ...f, productId: e.target.value || null, description: a ? a.name : f.description, rackRate: a ? a.pricePerPerson : f.rackRate, unit: 'pax' }))
                    }}
                    className={inputCls}>
                    <option value="">Select…</option>
                    {activities.filter(a => a.isActive).map(a => (
                      <option key={a.id} value={a.id}>{a.name} — {detail.currency} {a.pricePerPerson.toFixed(2)}/pax</option>
                    ))}
                  </select>
                </div>
              )}
              {itemForm.productType === 'Transfer' && (
                <div>
                  <label className={labelCls}>Transfer</label>
                  <select value={itemForm.productId ?? ''}
                    onChange={e => {
                      const a = transferActivities.find(x => x.id === e.target.value)
                      setItemForm(f => ({ ...f, productId: e.target.value || null, description: a ? a.name : f.description, rackRate: a ? a.pricePerPerson : f.rackRate, childRackRate: a?.childPricePerPerson ?? f.childRackRate, unit: 'pax' }))
                    }}
                    className={inputCls}>
                    <option value="">Select transfer…</option>
                    {transferActivities.filter(a => a.isActive).map(a => (
                      <option key={a.id} value={a.id}>{a.name} — {detail.currency} {a.pricePerPerson.toFixed(2)}/pax</option>
                    ))}
                  </select>
                </div>
              )}
              {itemForm.productType === 'ParkFee' && (
                <div>
                  <label className={labelCls}>Park Fee</label>
                  <select value={itemForm.productId ?? ''}
                    onChange={e => {
                      const a = parkFeeActivities.find(x => x.id === e.target.value)
                      setItemForm(f => ({ ...f, productId: e.target.value || null, description: a ? a.name : f.description, rackRate: a ? a.pricePerPerson : f.rackRate, childRackRate: a?.childPricePerPerson ?? f.childRackRate, unit: 'pax' }))
                    }}
                    className={inputCls}>
                    <option value="">Select…</option>
                    {parkFeeActivities.filter(a => a.isActive).map(a => (
                      <option key={a.id} value={a.id}>{a.name} — {detail.currency} {a.pricePerPerson.toFixed(2)}/adult{a.childPricePerPerson ? ` · ${a.childPricePerPerson.toFixed(2)}/child` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              {itemForm.productType === 'Helicopter' && (
                <div>
                  <label className={labelCls}>Helicopter Flight</label>
                  <select value={itemForm.productId ?? ''}
                    onChange={e => {
                      const a = helicopterActivities.find(x => x.id === e.target.value)
                      setItemForm(f => ({ ...f, productId: e.target.value || null, description: a ? a.name : f.description, rackRate: a ? a.pricePerPerson : f.rackRate, childRackRate: a?.childPricePerPerson ?? f.childRackRate, unit: 'pax' }))
                    }}
                    className={inputCls}>
                    <option value="">Select…</option>
                    {helicopterActivities.filter(a => a.isActive).map(a => (
                      <option key={a.id} value={a.id}>{a.name} — {detail.currency} {a.pricePerPerson.toFixed(2)}/pax</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Description *</label>
                <input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Sunset Cruise — 3 adults" className={inputCls} />
              </div>

              <div className={`grid gap-2 ${itemForm.productType === 'Other' ? 'grid-cols-4' : 'grid-cols-2'}`}>
                <div><label className={labelCls}>Qty *</label>
                  <input type="number" min={0.01} step={0.01} value={itemForm.quantity}
                    onChange={e => setItemForm(f => ({ ...f, quantity: Number(e.target.value) }))} className={inputCls} /></div>
                <div><label className={labelCls}>Unit</label>
                  <input list="units-list" value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))} className={inputCls} />
                  <datalist id="units-list">{['nights', 'pax', 'days', 'units'].map(u => <option key={u} value={u} />)}</datalist>
                </div>
                {itemForm.productType === 'Other' && (<>
                  <div><label className={labelCls}>Rack Rate *</label>
                    <input type="number" min={0} step={0.01} value={itemForm.rackRate}
                      onChange={e => setItemForm(f => ({ ...f, rackRate: Number(e.target.value) }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Cost Rate</label>
                    <input type="number" min={0} step={0.01} value={itemForm.costRate}
                      onChange={e => setItemForm(f => ({ ...f, costRate: Number(e.target.value) }))} className={inputCls} /></div>
                </>)}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-xs text-gray-500 mb-2 font-medium">Child Pax (optional)</p>
                <div className={`grid gap-2 ${itemForm.productType === 'Other' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                  <div><label className={labelCls}>Child Qty</label>
                    <input type="number" min={0} value={itemForm.childQuantity}
                      onChange={e => setItemForm(f => ({ ...f, childQuantity: Number(e.target.value) }))} className={inputCls} /></div>
                  {itemForm.productType === 'Other' && (<>
                    <div><label className={labelCls}>Child Rack Rate</label>
                      <input type="number" min={0} step={0.01} value={itemForm.childRackRate}
                        onChange={e => setItemForm(f => ({ ...f, childRackRate: Number(e.target.value) }))} className={inputCls} /></div>
                    <div><label className={labelCls}>Child Cost Rate</label>
                      <input type="number" min={0} step={0.01} value={itemForm.childCostRate}
                        onChange={e => setItemForm(f => ({ ...f, childCostRate: Number(e.target.value) }))} className={inputCls} /></div>
                  </>)}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-xs text-gray-500 mb-2 font-medium">Complimentary Pax (optional — no charge)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>Comp Adults</label>
                    <input type="number" min={0} value={itemForm.compAdultQuantity}
                      onChange={e => setItemForm(f => ({ ...f, compAdultQuantity: Number(e.target.value) }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Comp Adult Cost Rate</label>
                    <input type="number" min={0} step={0.01} value={itemForm.compAdultCostRate}
                      onChange={e => setItemForm(f => ({ ...f, compAdultCostRate: Number(e.target.value) }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Comp Children</label>
                    <input type="number" min={0} value={itemForm.compChildQuantity}
                      onChange={e => setItemForm(f => ({ ...f, compChildQuantity: Number(e.target.value) }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Comp Child Cost Rate</label>
                    <input type="number" min={0} step={0.01} value={itemForm.compChildCostRate}
                      onChange={e => setItemForm(f => ({ ...f, compChildCostRate: Number(e.target.value) }))} className={inputCls} /></div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-xs text-gray-500 mb-2 font-medium">Schedule (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>Service Date</label>
                    <input type="date" value={itemForm.serviceDate ?? ''}
                      onChange={e => setItemForm(f => ({ ...f, serviceDate: e.target.value || null }))} className={inputCls} /></div>
                  {itemForm.productType !== 'Accommodation' && (<>
                    <div><label className={labelCls}>Start Time</label>
                      <input type="time" value={itemForm.startTime ?? ''}
                        onChange={e => setItemForm(f => ({ ...f, startTime: e.target.value || null }))} className={inputCls} /></div>
                    <div><label className={labelCls}>Meeting Point</label>
                      <select value={itemForm.meetingPoint ?? ''}
                        onChange={e => setItemForm(f => ({ ...f, meetingPoint: e.target.value || null }))}
                        className={inputCls}>
                        <option value="">None</option>
                        {locations.filter(l => l.isActive).map(l => (
                          <option key={l.id} value={l.name}>{l.name} ({l.type})</option>
                        ))}
                      </select>
                    </div>
                  </>)}
                </div>
                <div className="mt-2">
                  <label className={labelCls}>Notes</label>
                  <input value={itemForm.notes ?? ''} placeholder="Driver notes, special instructions…"
                    onChange={e => setItemForm(f => ({ ...f, notes: e.target.value || null }))} className={inputCls} />
                </div>
              </div>

              {itemForm.rackRate > 0 && itemForm.quantity > 0 && (
                <div className="space-y-1 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>Adults ({itemForm.quantity}): Rack <strong className="text-gray-700 dark:text-gray-300">{itemForm.rackRate.toFixed(2)}</strong></span>
                    <span>→ Sell <strong className="text-blue-600">{sellingPreview.toFixed(2)}</strong></span>
                    <span>→ Total <strong className="text-green-600">{totalPreview.toFixed(2)}</strong></span>
                  </div>
                  {itemForm.childQuantity > 0 && itemForm.childRackRate > 0 && (<>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span>Children ({itemForm.childQuantity}): Rack <strong className="text-gray-700 dark:text-gray-300">{itemForm.childRackRate.toFixed(2)}</strong></span>
                      <span>→ Total <strong className="text-green-600">{childTotalPreview.toFixed(2)}</strong></span>
                    </div>
                  </>)}
                  {(itemForm.compAdultQuantity > 0 || itemForm.compChildQuantity > 0) && (
                    <div className="flex items-center gap-3 flex-wrap text-purple-600 dark:text-purple-400">
                      <span>Comp:</span>
                      {itemForm.compAdultQuantity > 0 && (
                        <span>{itemForm.compAdultQuantity} adult{itemForm.compAdultQuantity !== 1 ? 's' : ''}
                          {itemForm.compAdultCostRate > 0 ? ` · cost ${(itemForm.compAdultCostRate * itemForm.compAdultQuantity).toFixed(2)}` : ' · no cost'}
                        </span>
                      )}
                      {itemForm.compChildQuantity > 0 && (
                        <span>{itemForm.compChildQuantity} child{itemForm.compChildQuantity !== 1 ? 'ren' : ''}
                          {itemForm.compChildCostRate > 0 ? ` · cost ${(itemForm.compChildCostRate * itemForm.compChildQuantity).toFixed(2)}` : ' · no cost'}
                        </span>
                      )}
                      <strong>→ No charge to guest</strong>
                    </div>
                  )}
                  {itemForm.childQuantity > 0 && itemForm.childRackRate > 0 && (
                    <div className="font-medium pt-1 border-t border-gray-100 dark:border-gray-700">
                      Grand Total: <strong className="text-green-700 dark:text-green-400">{grandTotalPreview.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowAddItem(false); setItemForm(emptyItem) }}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button onClick={() => addItem.mutate()} disabled={addItem.isPending || !canAddItem}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {addItem.isPending ? 'Adding…' : '+ Add to Itinerary'}
                </button>
              </div>
              {addItem.isError && <p className="text-xs text-red-500">{String(addItem.error)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── RECORD PAYMENT MODAL ── */}
      {showAddPayment && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Record Payment</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {detail.reservationNumber} · Outstanding: {fmtCurrency(detail.outstandingBalance, detail.currency)}
                </p>
              </div>
              <button onClick={() => { setShowAddPayment(false); setPaymentForm(emptyPayment()) }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Amount *</label>
                  <input type="number" min={0.01} step={0.01} value={paymentForm.amount || ''}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: Number(e.target.value) }))}
                    placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={paymentForm.currency} onChange={e => setPaymentForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {paymentForm.currency !== 'USD' && (
                  <div>
                    <label className={labelCls}>Exchange Rate (to USD)</label>
                    <input type="number" min={0} step={0.0001} value={paymentForm.exchangeRate}
                      onChange={e => setPaymentForm(f => ({ ...f, exchangeRate: Number(e.target.value) }))} className={inputCls} />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Res. Discount %</label>
                  <input type="number" min={0} max={100} step={0.5} value={paymentForm.reservationistDiscountPercent}
                    onChange={e => setPaymentForm(f => ({ ...f, reservationistDiscountPercent: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Method</label>
                  <select value={paymentForm.paymentMethod} onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))} className={inputCls}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{pmLabel(m)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" value={paymentForm.paidAt}
                    onChange={e => setPaymentForm(f => ({ ...f, paidAt: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Reference</label>
                <input value={paymentForm.reference ?? ''} placeholder="Card ref, EFT ref, receipt #…"
                  onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value || null }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <input value={paymentForm.notes ?? ''} placeholder="Optional notes"
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value || null }))} className={inputCls} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowAddPayment(false); setPaymentForm(emptyPayment()) }}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button onClick={() => addPayment.mutate()} disabled={addPayment.isPending || !canAddPayment}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {addPayment.isPending ? 'Recording…' : '+ Record Payment'}
                </button>
              </div>
              {addPayment.isError && <p className="text-xs text-red-500">{String(addPayment.error)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
