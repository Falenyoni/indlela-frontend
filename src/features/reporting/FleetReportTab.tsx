import { useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getFleetServiceStatus, getAllOdometerReadings } from '../fleet/fleetApi'
import { getVehicles } from '../transport/transportApi'
import { MileageImportModal } from '../fleet/MileageImportModal'

const SERVICE_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Ok:      { bg: '#dcfce7', text: '#16a34a' },
  DueSoon: { bg: '#fef3c7', text: '#d97706' },
  Overdue: { bg: '#fee2e2', text: '#dc2626' },
}

const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
]

function isoMinus3Months() {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  return d.toISOString().split('T')[0]
}

function computeMonthlyKm(readings: { vehicleId: string; readingKm: number; readingDate: string }[]) {
  const sorted = [...readings].sort((a, b) =>
    a.vehicleId.localeCompare(b.vehicleId) || a.readingDate.localeCompare(b.readingDate)
  )
  const result: Record<string, Record<string, number>> = {}
  let prevVid = ''
  let prevKm = 0
  for (const r of sorted) {
    if (!result[r.vehicleId]) result[r.vehicleId] = {}
    if (r.vehicleId === prevVid) {
      const delta = r.readingKm - prevKm
      if (delta > 0) {
        const month = r.readingDate.substring(0, 7)
        result[r.vehicleId][month] = (result[r.vehicleId][month] ?? 0) + delta
      }
    }
    prevVid = r.vehicleId
    prevKm = r.readingKm
  }
  return result
}

function MileageChart({
  months, series, maxStack,
}: {
  months: string[]
  series: { label: string; color: string; data: number[] }[]
  maxStack: number
}) {
  const W = 600, H = 200
  const PAD = { top: 16, right: 16, bottom: 44, left: 56 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const barSpacing = cW / Math.max(months.length, 1)
  const barW = Math.max(6, barSpacing * 0.6)
  const yScale = (v: number) => cH - (v / maxStack) * cH
  const yTicks = [0, 0.5, 1].map(t => Math.round(maxStack * t))

  const stacked = months.map((_, mi) => {
    let cumY = 0
    return series.map(s => {
      const km = s.data[mi]
      const seg = { km, yFrom: cumY, yTo: cumY + km, color: s.color, label: s.label }
      cumY += km
      return seg
    })
  })

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} aria-hidden>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {yTicks.map(v => (
            <g key={v} transform={`translate(0,${yScale(v)})`}>
              <line x1={0} x2={cW} stroke="currentColor" strokeWidth={0.5} className="text-gray-200 dark:text-gray-700" />
              <text x={-6} y={4} textAnchor="end" fontSize={9} fill="currentColor" className="text-gray-400 dark:text-gray-500">
                {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              </text>
            </g>
          ))}
          {months.map((m, mi) => {
            const xCenter = mi * barSpacing + barSpacing / 2
            return (
              <g key={m}>
                {stacked[mi].map(seg => seg.km > 0 && (
                  <rect
                    key={seg.label}
                    x={xCenter - barW / 2}
                    y={yScale(seg.yTo)}
                    width={barW}
                    height={Math.max(1, yScale(seg.yFrom) - yScale(seg.yTo))}
                    fill={seg.color}
                    rx={1.5}
                  />
                ))}
                <text x={xCenter} y={cH + 14} textAnchor="middle" fontSize={9} fill="currentColor" className="text-gray-400">
                  {m.substring(5)}
                </text>
                <text x={xCenter} y={cH + 26} textAnchor="middle" fontSize={8} fill="currentColor" className="text-gray-300 dark:text-gray-600">
                  {m.substring(2, 4)}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {series.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({
  label, value, sub, accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'red' | 'amber'
}) {
  const valueColor =
    accent === 'red'   ? 'text-red-600 dark:text-red-400' :
    accent === 'amber' ? 'text-amber-600 dark:text-amber-400' :
    'text-gray-900 dark:text-gray-100'
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

const inputCls = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'

export function FleetReportTab() {
  const queryClient = useQueryClient()
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [fromDate, setFromDate] = useState(isoMinus3Months)
  const [toDate,   setToDate]   = useState(() => new Date().toISOString().split('T')[0])
  const [fuelRate, setFuelRate] = useState(() => Number(localStorage.getItem('fleet_fuel_rate') ?? '2.5'))
  const [showImport, setShowImport] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const { data: vehicles = [] }      = useQuery({ queryKey: ['vehicles'],             queryFn: () => getVehicles() })
  const { data: serviceStatus = [] } = useQuery({ queryKey: ['fleet-service-status'], queryFn: getFleetServiceStatus })
  const { data: readings = [], isLoading } = useQuery({
    queryKey: ['fleet-odometer-report', fromDate, toDate, vehicleFilter],
    queryFn: () => getAllOdometerReadings({
      from: fromDate || undefined,
      to:   toDate   || undefined,
      vehicleId: vehicleFilter || undefined,
    }),
  })

  const vehicleMap = useMemo(
    () => Object.fromEntries(vehicles.map(v => [v.id, v])),
    [vehicles]
  )
  const statusMap = useMemo(
    () => Object.fromEntries(serviceStatus.map(s => [s.vehicleId, s])),
    [serviceStatus]
  )

  const monthlyKmByVehicle = useMemo(() => computeMonthlyKm(readings), [readings])

  const vehicleRows = useMemo(() => {
    const ids = vehicleFilter
      ? [vehicleFilter]
      : [...new Set(readings.map(r => r.vehicleId))]

    return ids.map(vid => {
      const v      = vehicleMap[vid]
      const monthly = monthlyKmByVehicle[vid] ?? {}
      const periodKm = Object.values(monthly).reduce((s, x) => s + x, 0)
      const monthCount = Object.keys(monthly).length || 1
      const svc = statusMap[vid]
      return {
        vehicleId: vid,
        registration: v?.registration ?? '—',
        makeModel:    v ? `${v.make} ${v.model}` : '—',
        currentOdometer: svc?.currentOdometer ?? 0,
        periodKm,
        avgMonthly: periodKm / monthCount,
        monthly,
        status: (svc?.status ?? 'Ok') as 'Ok' | 'DueSoon' | 'Overdue',
      }
    }).sort((a, b) => b.periodKm - a.periodKm)
  }, [vehicleFilter, readings, vehicleMap, monthlyKmByVehicle, statusMap])

  const totalFleetKm    = vehicleRows.reduce((s, r) => s + r.periodKm, 0)
  const avgKmPerVehicle = vehicleRows.length ? totalFleetKm / vehicleRows.length : 0
  const overdueCount    = serviceStatus.filter(s => s.status === 'Overdue').length
  const dueSoonCount    = serviceStatus.filter(s => s.status === 'DueSoon').length

  const allMonths = useMemo(() => {
    const months = new Set<string>()
    Object.values(monthlyKmByVehicle).forEach(m => Object.keys(m).forEach(k => months.add(k)))
    return [...months].sort()
  }, [monthlyKmByVehicle])

  const chartData = useMemo(() => {
    const topVehicles = vehicleRows.slice(0, 8)
    const series = topVehicles.map((v, i) => ({
      label: v.registration,
      color: CHART_COLORS[i % CHART_COLORS.length],
      data: allMonths.map(m => v.monthly[m] ?? 0),
    }))
    const maxStack = Math.max(
      ...allMonths.map((_, mi) => series.reduce((s, ser) => s + ser.data[mi], 0)),
      1
    )
    return { months: allMonths, series, maxStack }
  }, [vehicleRows, allMonths])

  const fmtR = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const exportPdf = useCallback(async () => {
    setPdfLoading(true)
    try {
      const doc = new jsPDF()

      doc.setFontSize(18)
      doc.text('Fleet Mileage Report', 14, 20)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Period: ${fromDate || 'All'} → ${toDate || 'All'}`, 14, 28)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, 14, 34)

      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.text('Summary', 14, 46)
      autoTable(doc, {
        startY: 50,
        head: [['Fleet km', 'Avg km / Vehicle', 'Overdue', 'Due Soon']],
        body: [[
          totalFleetKm.toLocaleString(),
          Math.round(avgKmPerVehicle).toLocaleString(),
          String(overdueCount),
          String(dueSoonCount),
        ]],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      })

      const y1 = (doc as any).lastAutoTable?.finalY + 10 ?? 90
      doc.setFontSize(12)
      doc.text('Per-Vehicle Breakdown', 14, y1)
      autoTable(doc, {
        startY: y1 + 4,
        head: [['Registration', 'Make / Model', 'Period km', 'Avg km/mo', 'Odometer', 'Service', 'Est. Fuel']],
        body: vehicleRows.map(r => [
          r.registration,
          r.makeModel,
          r.periodKm.toLocaleString(),
          Math.round(r.avgMonthly).toLocaleString(),
          r.currentOdometer.toLocaleString(),
          r.status,
          fmtR(r.periodKm * fuelRate),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        bodyStyles: { fontSize: 9 },
      })

      const y2 = (doc as any).lastAutoTable?.finalY + 8 ?? 180
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text(`Fleet total: ${fmtR(totalFleetKm * fuelRate)}  ·  Fuel rate: R${fuelRate}/km (estimate only)`, 14, y2)

      doc.save(`fleet-report-${fromDate}-to-${toDate}.pdf`)
    } finally {
      setPdfLoading(false)
    }
  }, [vehicleRows, totalFleetKm, avgKmPerVehicle, overdueCount, dueSoonCount, fromDate, toDate, fuelRate])

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} className={inputCls}>
          <option value="">All vehicles</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.registration} — {v.make} {v.model}</option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={inputCls} />
        <span className="text-gray-400 text-sm">→</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={inputCls} />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            ↑ Import Mileage
          </button>
          <button
            onClick={exportPdf}
            disabled={pdfLoading || vehicleRows.length === 0}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfLoading ? 'Generating…' : '↓ Export PDF'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Fleet km"    value={totalFleetKm.toLocaleString()} sub="in selected period" />
        <StatCard label="Avg km / Vehicle"  value={Math.round(avgKmPerVehicle).toLocaleString()} sub={`across ${vehicleRows.length} vehicles`} />
        <StatCard label="Overdue"   value={overdueCount} sub="need service now"     accent="red" />
        <StatCard label="Due Soon"  value={dueSoonCount} sub="service approaching"  accent="amber" />
      </div>

      {/* Monthly trend */}
      {chartData.months.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly km Trend</h3>
          <MileageChart
            months={chartData.months}
            series={chartData.series}
            maxStack={chartData.maxStack}
          />
        </div>
      )}

      {/* Per-vehicle breakdown */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Per-Vehicle Breakdown</h3>
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : vehicleRows.length === 0 ? (
          <p className="text-sm text-gray-400">
            No mileage data for this period.{' '}
            <button
              onClick={() => setShowImport(true)}
              className="text-blue-600 dark:text-blue-400 underline"
            >
              Import mileage readings
            </button>{' '}
            to populate the report.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Registration', 'Make / Model', 'Period km', 'Avg km/mo', 'Odometer', 'Service'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {vehicleRows.map(row => {
                  const sStyle = SERVICE_STATUS_STYLES[row.status]
                  const maxPeriodKm = vehicleRows[0]?.periodKm || 1
                  return (
                    <tr key={row.vehicleId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">{row.registration}</td>
                      <td className="px-3 py-3 text-gray-500">{row.makeModel}</td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                            {row.periodKm.toLocaleString()} km
                          </span>
                          <div className="h-1.5 w-24 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${(row.periodKm / maxPeriodKm) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-500 tabular-nums">{Math.round(row.avgMonthly).toLocaleString()}</td>
                      <td className="px-3 py-3 text-gray-500 tabular-nums">{row.currentOdometer.toLocaleString()} km</td>
                      <td className="px-3 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: sStyle.bg, color: sStyle.text }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fuel cost estimate */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Fuel Cost Estimate</h3>
            <p className="text-xs text-gray-400 mt-0.5">Based on odometer data only — does not include actual receipts</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">Rate (R/km)</label>
            <input
              type="number"
              value={fuelRate}
              min={0}
              step={0.1}
              onChange={e => {
                const v = Number(e.target.value)
                setFuelRate(v)
                localStorage.setItem('fleet_fuel_rate', String(v))
              }}
              className={`${inputCls} w-24 text-right`}
            />
          </div>
        </div>

        {vehicleRows.length === 0 ? (
          <p className="text-sm text-gray-400">No data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Registration', 'Period km', 'Est. Fuel Cost'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {vehicleRows.map(row => (
                  <tr key={row.vehicleId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{row.registration}</td>
                    <td className="px-3 py-2 tabular-nums text-gray-500">{row.periodKm.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums font-medium text-gray-900 dark:text-gray-100">
                      {fmtR(row.periodKm * fuelRate)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 dark:border-gray-700 font-semibold bg-gray-50 dark:bg-gray-800">
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">Fleet Total</td>
                  <td className="px-3 py-2 tabular-nums text-gray-700 dark:text-gray-300">{totalFleetKm.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-900 dark:text-gray-100">{fmtR(totalFleetKm * fuelRate)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showImport && (
        <MileageImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['fleet-odometer-report'] })
            queryClient.invalidateQueries({ queryKey: ['fleet-service-status'] })
            setShowImport(false)
          }}
        />
      )}
    </div>
  )
}
