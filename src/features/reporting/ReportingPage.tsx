import { useQuery } from '@tanstack/react-query'
import { getReservations } from '../reservations/reservationsApi'
import { getGuests } from '../guests/guestsApi'
import { getProperties } from '../properties/propertiesApi'
import { getActivities } from '../activities/activitiesApi'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export function ReportingPage() {
  const { data: reservations = [] } = useQuery({ queryKey: ['reservations'], queryFn: () => getReservations() })
  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: () => getGuests() })
  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => getProperties() })
  const { data: activities = [] } = useQuery({ queryKey: ['activities'], queryFn: getActivities })

  const checkedIn = reservations.filter(r => r.status === 'CheckedIn').length
  const confirmed = reservations.filter(r => r.status === 'Confirmed').length
  const pending = reservations.filter(r => r.status === 'Pending').length
  const revenue = reservations.filter(r => ['CheckedIn', 'CheckedOut'].includes(r.status)).reduce((s, r) => s + r.totalAmount, 0)
  const available = properties.filter(p => p.status === 'Available').length
  const occupied = properties.filter(p => p.status === 'Occupied').length
  const occupancyRate = properties.length > 0 ? Math.round((occupied / properties.length) * 100) : 0

  const byStatus = ['Pending', 'Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled', 'NoShow'].map(s => ({
    status: s,
    count: reservations.filter(r => r.status === s).length,
  })).filter(x => x.count > 0)

  const STATUS_COLORS: Record<string, string> = {
    Pending: 'bg-yellow-400', Confirmed: 'bg-blue-500', CheckedIn: 'bg-green-500',
    CheckedOut: 'bg-gray-400', Cancelled: 'bg-red-400', NoShow: 'bg-orange-400',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reporting</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of operations and revenue</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Guests" value={guests.length} />
        <StatCard label="Total Reservations" value={reservations.length} sub={`${checkedIn} checked in · ${confirmed} confirmed · ${pending} pending`} />
        <StatCard label="Occupancy Rate" value={`${occupancyRate}%`} sub={`${occupied} occupied · ${available} available`} />
        <StatCard label="Revenue" value={`R ${revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} sub="From checked in & checked out reservations" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Reservations by Status</h3>
          {byStatus.length === 0 ? <p className="text-sm text-gray-400">No reservations yet</p> : (
            <div className="space-y-2">
              {byStatus.map(({ status, count }) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{status}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-400'}`} style={{ width: `${(count / reservations.length) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Properties at a Glance</h3>
          <div className="space-y-2">
            {['Available', 'Occupied', 'Maintenance', 'OutOfOrder'].map(status => {
              const count = properties.filter(p => p.status === status).length
              const pct = properties.length > 0 ? (count / properties.length) * 100 : 0
              const colors: Record<string, string> = { Available: 'bg-green-500', Occupied: 'bg-blue-500', Maintenance: 'bg-yellow-400', OutOfOrder: 'bg-red-400' }
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{status}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[status]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Reservations</h3>
          <div className="space-y-2">
            {reservations.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{r.guestName}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">{r.baseLocationName ?? r.reservationNumber}</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-gray-100">R {r.totalAmount.toFixed(2)}</span>
              </div>
            ))}
            {reservations.length === 0 && <p className="text-sm text-gray-400">No reservations yet</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Activities</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activities.length}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activities.filter(a => a.isActive).length}</p>
            </div>
          </div>
          <div className="space-y-1 pt-1">
            {activities.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{a.name}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">R {a.pricePerPerson.toFixed(2)}/person</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
