import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getReservations, type BookingRow } from '../reservations/reservationsApi'

// ── helpers ───────────────────────────────────────────────────────────────────

function monthKey(s: string) { return s.slice(0, 7) }

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })
}

function fmt(n: number) {
  return n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(Math.round(n))
}

function lastNMonths(n: number): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

// ── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; value: number; projected?: boolean }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1 h-36">
      {data.map(d => {
        const pct = (d.value / max) * 100
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {fmtShort(d.value)}
            </span>
            <div className="w-full rounded-t-sm" style={{
              height: `${Math.max(pct, 2)}%`,
              background: d.projected
                ? 'repeating-linear-gradient(45deg,#6366f1,#6366f1 2px,#a5b4fc 2px,#a5b4fc 6px)'
                : '#3b82f6',
              opacity: d.value === 0 ? 0.2 : 0.85,
            }} />
            <span className="text-[9px] text-gray-500 dark:text-gray-500 whitespace-nowrap">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Mini progress bar ────────────────────────────────────────────────────────

function MiniBar({ value, max, color = '#3b82f6' }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%`, background: color }} />
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'blue' }: { label: string; value: string; sub?: string; color?: string }) {
  const accent: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900',
    green:  'bg-green-50 dark:bg-green-950/40 border-green-100 dark:border-green-900',
    amber:  'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900',
    purple: 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900',
  }
  return (
    <div className={`rounded-xl border p-4 ${accent[color] ?? accent.blue}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Slider ───────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format: (v: number) => string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-blue-600 cursor-pointer" />
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'trends' | 'playground'

export function FinancialPage() {
  const [tab, setTab] = useState<Tab>('overview')

  const { data: allBookings = [] } = useQuery({
    queryKey: ['reservations', ''],
    queryFn: () => getReservations(),
  })

  // ── derived data ──────────────────────────────────────────────────────────

  const revenueBookings = useMemo(
    () => allBookings.filter((b: BookingRow) => b.status === 'Completed' || b.status === 'Confirmed' || b.status === 'InProgress'),
    [allBookings],
  )

  const totalRevenue  = useMemo(() => revenueBookings.reduce((s: number, b: BookingRow) => s + b.totalAmount, 0), [revenueBookings])
  const avgValue      = revenueBookings.length ? totalRevenue / revenueBookings.length : 0
  const outstanding   = useMemo(() => allBookings.filter((b: BookingRow) => b.status !== 'Completed' && b.status !== 'Cancelled')
                          .reduce((s: number, b: BookingRow) => s + b.totalAmount, 0), [allBookings])

  const now = new Date()
  const thisMonthKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthRev  = revenueBookings.filter((b: BookingRow) => monthKey(b.travelStartDate) === thisMonthKey)
                          .reduce((s: number, b: BookingRow) => s + b.totalAmount, 0)

  // monthly revenue map
  const monthlyRevMap = useMemo(() => {
    const map: Record<string, number> = {}
    revenueBookings.forEach((b: BookingRow) => {
      const k = monthKey(b.travelStartDate)
      map[k] = (map[k] ?? 0) + b.totalAmount
    })
    return map
  }, [revenueBookings])

  const monthlyCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    allBookings.forEach((b: BookingRow) => {
      const k = monthKey(b.travelStartDate)
      map[k] = (map[k] ?? 0) + 1
    })
    return map
  }, [allBookings])

  const months12 = useMemo(() => lastNMonths(12), [])

  // avg monthly revenue from last 6 months with data
  const avg6MonthRev = useMemo(() => {
    const last6 = lastNMonths(6)
    const withData = last6.filter(k => (monthlyRevMap[k] ?? 0) > 0)
    if (!withData.length) return avgValue * 3 // fallback
    return withData.reduce((s, k) => s + monthlyRevMap[k], 0) / withData.length
  }, [monthlyRevMap, avgValue])

  // source breakdown
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, { count: number; rev: number }> = {}
    revenueBookings.forEach((b: BookingRow) => {
      const src = b.bookingSource || 'Unknown'
      if (!map[src]) map[src] = { count: 0, rev: 0 }
      map[src].count++
      map[src].rev += b.totalAmount
    })
    return Object.entries(map).sort((a, b) => b[1].rev - a[1].rev)
  }, [revenueBookings])

  // status breakdown
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    allBookings.forEach((b: BookingRow) => { map[b.status] = (map[b.status] ?? 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [allBookings])

  // ── playground state ──────────────────────────────────────────────────────

  const [growthRate, setGrowthRate]       = useState(5)    // % per month
  const [projectMonths, setProjectMonths] = useState(12)
  const [vehicleCost, setVehicleCost]     = useState(500_000)
  const [numVehicles, setNumVehicles]     = useState(1)
  const [opCostPerVeh, setOpCostPerVeh]   = useState(15_000) // monthly fuel + maintenance
  const [driverSalary, setDriverSalary]   = useState(12_000)
  const [bookingsPerVeh, setBookingsPerVeh] = useState(4)   // per month

  const projections = useMemo(() => {
    const rows: { month: string; revenue: number; cumulative: number }[] = []
    let base = avg6MonthRev
    let cum = 0
    for (let i = 1; i <= projectMonths; i++) {
      base = base * (1 + growthRate / 100)
      cum += base
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const label = d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })
      rows.push({ month: label, revenue: base, cumulative: cum })
    }
    return rows
  }, [avg6MonthRev, growthRate, projectMonths])

  const totalProjectedRev   = projections.at(-1)?.cumulative ?? 0
  const monthlyFleetCost    = numVehicles * (opCostPerVeh + driverSalary)
  const totalCapex          = numVehicles * vehicleCost
  const netMonthlyFromFleet = (avgValue * bookingsPerVeh * numVehicles) - monthlyFleetCost
  const paybackMonths       = netMonthlyFromFleet > 0 ? Math.ceil(totalCapex / netMonthlyFromFleet) : null

  // ── tab bar ───────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',    label: 'Overview' },
    { id: 'trends',      label: 'Trends' },
    { id: 'playground',  label: 'Playground' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Performance overview and scenario planning</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={`ZAR ${fmtShort(totalRevenue)}`}
              sub={`${revenueBookings.length} active bookings`} color="blue" />
            <KpiCard label="This Month" value={`ZAR ${fmtShort(thisMonthRev)}`}
              sub={`${allBookings.filter((b: BookingRow) => monthKey(b.travelStartDate) === thisMonthKey).length} bookings`} color="green" />
            <KpiCard label="Avg Booking Value" value={`ZAR ${fmtShort(avgValue)}`}
              sub="confirmed + completed" color="purple" />
            <KpiCard label="Pipeline" value={`ZAR ${fmtShort(outstanding)}`}
              sub="enquiry + quoted + confirmed" color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking source */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue by Source</h3>
              {sourceBreakdown.length === 0
                ? <p className="text-sm text-gray-400">No data yet</p>
                : <div className="space-y-3">
                  {sourceBreakdown.map(([src, d]) => (
                    <div key={src} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{src}</span>
                        <span className="text-gray-500 tabular-nums">ZAR {fmt(d.rev)} · {d.count} bookings</span>
                      </div>
                      <MiniBar value={d.rev} max={sourceBreakdown[0][1].rev} />
                    </div>
                  ))}
                </div>
              }
            </div>

            {/* Status breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Bookings by Status</h3>
              {statusBreakdown.length === 0
                ? <p className="text-sm text-gray-400">No data yet</p>
                : <div className="space-y-3">
                  {statusBreakdown.map(([status, count]) => {
                    const colors: Record<string, string> = {
                      Completed: '#14b8a6', Confirmed: '#3b82f6', InProgress: '#22c55e',
                      Quoted: '#a855f7', Enquiry: '#6b7280', Cancelled: '#ef4444',
                    }
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{status}</span>
                          <span className="text-gray-500 tabular-nums">{count} bookings</span>
                        </div>
                        <MiniBar value={count} max={statusBreakdown[0][1]} color={colors[status] ?? '#6b7280'} />
                      </div>
                    )
                  })}
                </div>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── TRENDS ───────────────────────────────────────────────────────── */}
      {tab === 'trends' && (
        <div className="space-y-6">
          {/* Revenue chart */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Monthly Revenue</h3>
                <p className="text-xs text-gray-500 mt-0.5">Based on travel start date · confirmed & completed</p>
              </div>
              <span className="text-xs text-gray-400">Last 12 months</span>
            </div>
            <BarChart data={months12.map(k => ({ label: monthLabel(k), value: monthlyRevMap[k] ?? 0 }))} />
          </div>

          {/* Booking count chart */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Booking Volume</h3>
                <p className="text-xs text-gray-500 mt-0.5">All bookings by travel start month</p>
              </div>
            </div>
            <BarChart data={months12.map(k => ({ label: monthLabel(k), value: monthlyCountMap[k] ?? 0 }))} />
          </div>

          {/* Monthly detail table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                <tr>{['Month', 'Bookings', 'Revenue', 'Avg Value'].map(h =>
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...months12].reverse().map(k => {
                  const rev   = monthlyRevMap[k] ?? 0
                  const count = monthlyCountMap[k] ?? 0
                  return (
                    <tr key={k} className={k === thisMonthKey ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium">
                        {monthLabel(k)}{k === thisMonthKey && <span className="ml-2 text-xs text-blue-500">current</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 tabular-nums">{count}</td>
                      <td className="px-4 py-2.5 tabular-nums font-medium text-gray-900 dark:text-gray-100">
                        {rev > 0 ? `ZAR ${fmt(rev)}` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 tabular-nums">
                        {count > 0 ? `ZAR ${fmt(rev / count)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PLAYGROUND ───────────────────────────────────────────────────── */}
      {tab === 'playground' && (
        <div className="space-y-6">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
            Projections are estimates based on your historical booking data. Adjust the sliders to model different scenarios.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Growth projections ── */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-5">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Revenue Projections</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Based on your avg monthly revenue of <strong>ZAR {fmtShort(avg6MonthRev)}</strong> (last 6 months)
                </p>
              </div>

              <Slider label="Monthly growth rate" value={growthRate} min={0} max={30} step={0.5}
                onChange={setGrowthRate} format={v => `${v}%`} />
              <Slider label="Projection horizon" value={projectMonths} min={3} max={24} step={1}
                onChange={setProjectMonths} format={v => `${v} months`} />

              {/* Projection bar chart */}
              <BarChart data={projections.map(r => ({ label: r.month, value: r.revenue, projected: true }))} />

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Projected total</p>
                  <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                    ZAR {fmtShort(totalProjectedRev)}
                  </p>
                  <p className="text-xs text-gray-400">over {projectMonths} months</p>
                </div>
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Month {projectMonths} revenue</p>
                  <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                    ZAR {fmtShort(projections.at(-1)?.revenue ?? 0)}
                  </p>
                  <p className="text-xs text-gray-400">at {growthRate}% / month</p>
                </div>
              </div>

              {/* Projection table */}
              <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>{['Month', 'Revenue', 'Cumulative'].map(h =>
                      <th key={h} className="text-left px-3 py-2 font-medium text-gray-500">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {projections.map(r => (
                      <tr key={r.month}>
                        <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{r.month}</td>
                        <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100 tabular-nums">ZAR {fmt(r.revenue)}</td>
                        <td className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 tabular-nums">ZAR {fmt(r.cumulative)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Fleet ROI calculator ── */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-5">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Fleet Expansion ROI</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Should you buy more vehicles? Your avg booking value is <strong>ZAR {fmtShort(avgValue)}</strong>
                </p>
              </div>

              <Slider label="Vehicles to add" value={numVehicles} min={1} max={10} step={1}
                onChange={setNumVehicles} format={v => `${v} vehicle${v > 1 ? 's' : ''}`} />
              <Slider label="Cost per vehicle" value={vehicleCost} min={100_000} max={2_000_000} step={50_000}
                onChange={setVehicleCost} format={v => `ZAR ${fmtShort(v)}`} />
              <Slider label="Monthly ops / vehicle (fuel + maint.)" value={opCostPerVeh} min={2_000} max={50_000} step={1_000}
                onChange={setOpCostPerVeh} format={v => `ZAR ${fmtShort(v)}`} />
              <Slider label="Driver salary / vehicle" value={driverSalary} min={5_000} max={40_000} step={500}
                onChange={setDriverSalary} format={v => `ZAR ${fmtShort(v)}`} />
              <Slider label="Bookings per vehicle per month" value={bookingsPerVeh} min={1} max={20} step={1}
                onChange={setBookingsPerVeh} format={v => `${v} bookings`} />

              {/* Results */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Monthly impact</h4>
                {[
                  { label: 'Added revenue',    value: `ZAR ${fmt(avgValue * bookingsPerVeh * numVehicles)}`,  color: 'text-green-600 dark:text-green-400' },
                  { label: 'Added OpEx',       value: `− ZAR ${fmt(monthlyFleetCost)}`,                       color: 'text-red-500 dark:text-red-400' },
                  { label: 'Net monthly',      value: `ZAR ${fmt(netMonthlyFromFleet)}`,                      color: netMonthlyFromFleet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400', bold: true },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
                    <span className={`tabular-nums ${row.bold ? 'font-bold' : 'font-medium'} ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4 space-y-3 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total capex</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">ZAR {fmt(totalCapex)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Payback period</span>
                  <span className={`font-bold tabular-nums ${paybackMonths && paybackMonths <= 24 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {paybackMonths == null
                      ? 'Never (negative ROI)'
                      : paybackMonths > 60
                      ? `${Math.round(paybackMonths / 12)} yrs+`
                      : paybackMonths >= 12
                      ? `${(paybackMonths / 12).toFixed(1)} yrs`
                      : `${paybackMonths} months`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">12-month net profit</span>
                  <span className={`font-bold tabular-nums ${netMonthlyFromFleet * 12 - totalCapex >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    ZAR {fmt(netMonthlyFromFleet * 12 - totalCapex)}
                  </span>
                </div>
              </div>

              {paybackMonths != null && paybackMonths <= 36 && (
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-800 dark:text-green-300">
                  At {bookingsPerVeh} bookings/vehicle/month, you recover the investment in <strong>{paybackMonths} months</strong>. Consider the purchase.
                </div>
              )}
              {(paybackMonths == null || paybackMonths > 36) && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-800 dark:text-red-300">
                  At current parameters the payback period is too long. Try increasing bookings per vehicle or reducing costs.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
