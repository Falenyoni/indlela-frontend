import { useNavigate } from 'react-router'
import { useAuth } from '@/shared/lib/auth/AuthContext'

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="md:hidden p-2 -ml-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
          {user?.organizationName}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">{user?.fullName}</div>
        <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
          {initials}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
