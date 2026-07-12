import { Link } from 'react-router'
import { useAuth } from '@/shared/lib/auth/AuthContext'

const shortcuts = [
  { to: '/guests', label: 'Guests', icon: '🧳', description: 'Registry and profiles' },
  { to: '/reservations', label: 'Reservations', icon: '📅', description: 'Bookings across properties' },
  { to: '/properties', label: 'Properties', icon: '🏨', description: 'Venues and units' },
  { to: '/housekeeping', label: 'Housekeeping', icon: '🧹', description: 'Room status and tasks' },
  { to: '/transport', label: 'Transport', icon: '🚐', description: 'Guest transfers' },
  { to: '/activities', label: 'Activities', icon: '🎟️', description: 'Experiences and excursions' },
  { to: '/billing', label: 'Billing', icon: '💳', description: 'Invoices and payments' },
]

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome{user ? `, ${user.fullName}` : ''}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {user?.organizationName ?? 'Indlela hospitality management'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {shortcuts.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-1 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <span className="text-2xl leading-none">{s.icon}</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2">{s.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
