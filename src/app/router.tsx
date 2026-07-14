import { createBrowserRouter } from 'react-router'
import { lazy, Suspense } from 'react'
import App from '@/App'
import { ProtectedRoute } from '@/shared/lib/auth/ProtectedRoute'
import { PermissionGuard } from '@/shared/lib/auth/PermissionGuard'
import { Permissions } from '@/shared/lib/auth/permissions'

const DashboardPage    = lazy(() => import('@/app/DashboardPage').then(m => ({ default: m.DashboardPage })))
const GuestsPage       = lazy(() => import('@/features/guests/GuestsPage').then(m => ({ default: m.GuestsPage })))
const ReservationsPage        = lazy(() => import('@/features/reservations/ReservationsPage').then(m => ({ default: m.ReservationsPage })))
const DiscountRequestsPage    = lazy(() => import('@/features/reservations/DiscountRequestsPage').then(m => ({ default: m.DiscountRequestsPage })))
const HousekeepingPage = lazy(() => import('@/features/housekeeping/HousekeepingPage').then(m => ({ default: m.HousekeepingPage })))
const TransportPage    = lazy(() => import('@/features/transport/TransportPage').then(m => ({ default: m.TransportPage })))
const BillingPage      = lazy(() => import('@/features/billing/BillingPage').then(m => ({ default: m.BillingPage })))
const SettingsPage     = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ReportingPage    = lazy(() => import('@/features/reporting/ReportingPage').then(m => ({ default: m.ReportingPage })))
const LoginPage        = lazy(() => import('@/features/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const SetupPage        = lazy(() => import('@/features/setup/SetupPage').then(m => ({ default: m.SetupPage })))

function load(element: React.ReactNode) {
  return <Suspense fallback={<div>Loading...</div>}>{element}</Suspense>
}

function guard(permissions: string[], element: React.ReactNode) {
  return load(<PermissionGuard anyPermission={permissions}>{element}</PermissionGuard>)
}

const bookings  = [Permissions.Bookings.ViewOwn, Permissions.Bookings.ViewAll]
const discounts = [Permissions.Discounts.Request, Permissions.Discounts.Approve]
const transport = [Permissions.Transfers.Assign, Permissions.Transfers.ViewOwn, Permissions.Fleet.View]
const settings  = [Permissions.Settings.Users, Permissions.MasterData.View]

export const router = createBrowserRouter([
  { path: '/login', element: load(<LoginPage />) },
  { path: '/setup', element: load(<SetupPage />) },
  {
    path: '/',
    element: <App />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { index: true,              element: load(<DashboardPage />) },
          { path: 'guests',           element: guard(bookings,  <GuestsPage />) },
          { path: 'reservations',      element: guard(bookings,   <ReservationsPage />) },
          { path: 'discount-requests', element: guard(discounts, <DiscountRequestsPage />) },
          { path: 'transport',        element: guard(transport,  <TransportPage />) },
          { path: 'housekeeping',     element: guard(settings,   <HousekeepingPage />) },
          { path: 'billing',          element: guard(settings,   <BillingPage />) },
          { path: 'reporting',        element: guard([Permissions.Reports.View], <ReportingPage />) },
          { path: 'settings',         element: guard(settings,   <SettingsPage />) },
        ],
      },
    ],
  },
])
