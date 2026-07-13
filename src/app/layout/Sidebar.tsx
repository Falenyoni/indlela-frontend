import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAuth } from '@/shared/lib/auth/AuthContext'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/guests', label: 'Guests', icon: '🧳' },
  { to: '/reservations', label: 'Reservations', icon: '📅' },
  { to: '/properties', label: 'Properties', icon: '🏨' },
  { to: '/housekeeping', label: 'Housekeeping', icon: '🧹' },
  { to: '/transport', label: 'Transport', icon: '🚐' },
  { to: '/activities', label: 'Activities', icon: '🎟️' },
  { to: '/suppliers', label: 'Suppliers', icon: '🏢' },
  { to: '/agents', label: 'Agents', icon: '🤝' },
  { to: '/locations', label: 'Locations', icon: '📍' },
  { to: '/billing', label: 'Billing', icon: '💳' },
  { to: '/reporting', label: 'Reporting', icon: '📊' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
  }`

function NavContent({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  return (
    <>
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">Indlela</span>
        {user && (
          <div className="space-y-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">Organization</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user.organizationName}
            </p>
          </div>
        )}
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-200 dark:border-gray-800 px-2 py-3">
        <NavLink to="/settings" className={linkClass}>
          <span className="text-base leading-none">⚙️</span>
          Settings
        </NavLink>
      </div>
    </>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    onClose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-screen sticky top-0 flex-col">
        <NavContent user={user} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
          <aside className="relative w-64 flex flex-col bg-white dark:bg-gray-900 h-screen shadow-xl overflow-hidden">
            <NavContent user={user} />
          </aside>
        </div>
      )}
    </>
  )
}
