import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getReservations, type BookingRow } from '../reservations/reservationsApi'
import { getGuests } from '../guests/guestsApi'
import { getProperties } from '../properties/propertiesApi'
import { getActivities } from '../activities/activitiesApi'

const STATUSES = ['', 'Enquiry', 'Quoted', 'Confirmed', 'InProgress', 'Completed', 'Cancelled']

const STATUS_COLORS: Record<string, string> = {
  Enquiry:    '#6b7280',
  Quoted:     '#a855f7',
  Confirmed:  '#3b82f6',
  InProgress: '#22c55e',
  Completed:  '#14b8a6',
  Cancelled:  '#ef4444',
}

type DatePeriod = '' | 'today' | 'week' | 'month' | 'year' | 'custom'
const DATE_PERIODS: { value: DatePeriod; label: string }[] = [
  { value: '',       label: 'All time' },
  { value: 'today',  label: 'Today' },
  { value: 'week',   label: 'This week' },
  { value: 'month',  label: 'This month' },
  { value: 'year',   label: 'This year' },
  { value: 'custom', label: 'Custom…' },
]

function getPeriodRange(period: DatePeriod): { from: string; to: string } | null {
  if (!period || period === 'custom') return null
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (period === 'today') { const t = fmt(now); return { from: t, to: t } }
  if (period === 'week') {
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1
    const mon = new Date(now); mon.setDate(now.getDate() - day)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { from: fmt(mon), to: fmt(sun) }
  }
  if (period === 'month') {
    const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    return { from, to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
  }
  return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` }
}

const selectCls = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
const dateCls  = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%`, background: color }} />
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export function ReportingPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [datePeriod,   setDatePeriod]   = useState<DatePeriod>('')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')

  const { data: allBookings  = [] } = useQuery({ queryKey: ['reservations', ''],  queryFn: () => getReservations() })
  const { data: guests       = [] } = useQuery({ queryKey: ['guests'],             queryFn: () => getGuests() })
  const { data: properties   = [] } = useQuery({ queryKey: ['properties'],         queryFn: () => getProperties() })
  const { data: activities   = [] } = useQuery({ queryKey: ['activities'],         queryFn: () => getActivities() })

  const periodRange = datePeriod === 'custom'
    ? (customFrom && customTo ? { from: customFrom, to: customTo } : null)
    : getPeriodRange(datePeriod)

  const filtered = useMemo(() => {
    let rows = allBookings as BookingRow[]
    if (statusFilter) rows = rows.filter(r => r.status === statusFilter)
    if (periodRange)  rows = rows.filter(r => r.travelStartDate <= periodRange.to && r.travelEndDate >= periodRange.from)
    return rows
  }, [allBookings, statusFilter, periodRange])

  const revenue       = filtered.filter(r => r.status === 'Completed' || r.status === 'InProgress').reduce((s, r) => s + r.totalAmount, 0)
  const inProgress    = filtered.filter(r => r.status === 'InProgress').length
  const confirmed     = filtered.filter(r => r.status === 'Confirmed').length
  const totalPax      = filtered.reduce((s, r) => s + r.pax, 0)

  const byStatus = STATUSES.slice(1).map(s => ({
    status: s,
    count: filtered.filter(r => r.status === s).length,
  })).filter(x => x.count > 0)

  const bySource = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(r => { const s = r.bookingSource || 'Unknown'; map[s] = (map[s] ?? 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const propertyByStatus = useMemo(() => {
    const map: Record<string, number> = {}
    properties.forEach(p => { map[p.status] = (map[p.status] ?? 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [properties])

  const PROP_COLORS: Record<string, string> = {
    Available: '#22c55e', Occupied: '#3b82f6', Maintenance: '#f59e0b', OutOfOrder: '#ef4444',
  }

  const fmt = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reporting</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Operational snapshot across bookings, properties and activities</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        <select value={datePeriod} onChange={e => setDatePeriod(e.target.value as DatePeriod)} className={selectCls}>
          {DATE_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {datePeriod === 'custom' && (<>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={dateCls} />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   className={dateCls} />
        </>)}
        {(statusFilter || periodRange) && (
          <span className="text-xs text-gray-400">{filtered.length} of {allBookings.length} bookings</span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Guests"      value={guests.length} />
        <StatCard label="Filtered Bookings" value={filtered.length}
          sub={`${inProgress} in progress · ${confirmed} confirmed`} />
        <StatCard label="Total Pax"         value={totalPax} sub="across filtered bookings" />
        <StatCard label="Revenue"           value={`ZAR ${fmt(revenue)}`} sub="completed + in progress" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Bookings by status */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Bookings by Status</h3>
          {byStatus.length === 0
            ? <p className="text-sm text-gray-400">No bookings match the current filter</p>
            : <div className="space-y-3">
              {byStatus.map(({ status, count }) => (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{status}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{count}</span>
                  </div>
                  <MiniBar value={count} max={byStatus[0].count} color={STATUS_COLORS[status] ?? '#6b7280'} />
                </div>
              ))}
            </div>
          }
        </div>

        {/* Bookings by source */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Bookings by Source</h3>
          {bySource.length === 0
            ? <p className="text-sm text-gray-400">No data</p>
            : <div className="space-y-3">
              {bySource.map(([src, count]) => (
                <div key={src} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{src}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{count}</span>
                  </div>
                  <MiniBar value={count} max={bySource[0][1]} color="#6366f1" />
                </div>
              ))}
            </div>
          }
        </div>

        {/* Properties */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Properties</h3>
            <span className="text-xs text-gray-400">{properties.length} total</span>
          </div>
          {propertyByStatus.length === 0
            ? <p className="text-sm text-gray-400">No properties configured</p>
            : <div className="space-y-3">
              {propertyByStatus.map(([status, count]) => (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{status}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{count}</span>
                  </div>
                  <MiniBar value={count} max={properties.length} color={PROP_COLORS[status] ?? '#6b7280'} />
                </div>
              ))}
            </div>
          }
        </div>

        {/* Activities */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Activities</h3>
            <span className="text-xs text-gray-400">{activities.filter(a => a.isActive).length} active of {activities.length}</span>
          </div>
          {activities.length === 0
            ? <p className="text-sm text-gray-400">No activities configured</p>
            : <div className="space-y-2">
              {activities.slice(0, 6).map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    <span className="text-gray-700 dark:text-gray-300 truncate">{a.name}</span>
                  </div>
                  <span className="text-gray-500 tabular-nums shrink-0 ml-2">ZAR {a.pricePerPerson.toFixed(2)}/pax</span>
                </div>
              ))}
              {activities.length > 6 && <p className="text-xs text-gray-400">+{activities.length - 6} more</p>}
            </div>
          }
        </div>

        {/* Recent bookings */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3 md:col-span-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Bookings</h3>
          {filtered.length === 0
            ? <p className="text-sm text-gray-400">No bookings match the current filter</p>
            : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 bg-gray-50 dark:bg-gray-800">
                  <tr>{['Ref', 'Guest', 'Agent', 'Dates', 'Pax', 'Total', 'Status'].map(h =>
                    <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.slice(0, 10).map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">{r.reservationNumber}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{r.guestName}</td>
                      <td className="px-3 py-2 text-gray-500">{r.agentName ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.travelStartDate} → {r.travelEndDate}</td>
                      <td className="px-3 py-2 text-gray-500 tabular-nums">{r.pax}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 tabular-nums">{r.currency} {r.totalAmount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: (STATUS_COLORS[r.status] ?? '#6b7280') + '22', color: STATUS_COLORS[r.status] ?? '#6b7280' }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 10 && (
                <p className="text-xs text-gray-400 px-3 py-2">Showing 10 of {filtered.length} bookings</p>
              )}
            </div>
          }
        </div>
      </div>
    </div>
  )
}
