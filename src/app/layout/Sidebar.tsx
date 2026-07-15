import React, { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAuth } from '@/shared/lib/auth/AuthContext'
import { Permissions } from '@/shared/lib/auth/permissions'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
  anyPermission?: string[]
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/guests',       label: 'Guests',       icon: '🧳', anyPermission: [Permissions.Bookings.ViewOwn, Permissions.Bookings.ViewAll] },
  { to: '/reservations',     label: 'Reservations',     icon: '📅', anyPermission: [Permissions.Bookings.ViewOwn, Permissions.Bookings.ViewAll] },
  { to: '/discount-requests', label: 'Discounts',       icon: '🏷️', anyPermission: [Permissions.Discounts.Request, Permissions.Discounts.Approve] },
  { to: '/transport',    label: 'Transport',    icon: '🚐', anyPermission: [Permissions.Transfers.Assign, Permissions.Transfers.ViewOwn, Permissions.Fleet.View] },
  { to: '/housekeeping', label: 'Housekeeping', icon: '🧹', anyPermission: [Permissions.MasterData.View] },
  { to: '/reporting',    label: 'Reporting',    icon: '📊', anyPermission: [Permissions.Reports.View] },
  { to: '/financial',    label: 'Financial',    icon: '💹', anyPermission: [Permissions.Reports.View] },
  { to: '/billing',      label: 'Billing',      icon: '💳', anyPermission: [Permissions.Settings.Users] },
]

const settingsItem: NavItem = {
  to: '/settings', label: 'Settings', icon: '⚙️', anyPermission: [Permissions.Settings.Users, Permissions.MasterData.View],
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? '' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
  }`

const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties =>
  isActive
    ? { color: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }
    : {}

function NavContent({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const { hasPermission } = useAuth()

  const isVisible = (item: NavItem) =>
    !item.anyPermission || item.anyPermission.some(p => hasPermission(p))

  return (
    <>
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
        <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>Indlela</span>
        {user && (
          <div className="space-y-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">Organization</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user.organizationName}
            </p>
            {user.roles.length > 0 && (
              <p className="text-xs" style={{ color: 'var(--color-primary)' }}>{user.roles.join(', ')}</p>
            )}
          </div>
        )}
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.filter(isVisible).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} style={linkStyle}>
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      {isVisible(settingsItem) && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-2 py-3">
          <NavLink to="/settings" className={linkClass} style={linkStyle}>
            <span className="text-base leading-none">⚙️</span>
            Settings
          </NavLink>
        </div>
      )}
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
      <aside className="hidden md:flex w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-screen sticky top-0 flex-col">
        <NavContent user={user} />
      </aside>

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
