import { createBrowserRouter } from 'react-router'
import { lazy, Suspense } from 'react'
import App from '@/App'
import { ProtectedRoute } from '@/shared/lib/auth/ProtectedRoute'

const DashboardPage = lazy(() =>
  import('@/app/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const GuestsPage = lazy(() =>
  import('@/features/guests/GuestsPage').then((m) => ({ default: m.GuestsPage })),
)
const ReservationsPage = lazy(() =>
  import('@/features/reservations/ReservationsPage').then((m) => ({ default: m.ReservationsPage })),
)
const PropertiesPage = lazy(() =>
  import('@/features/properties/PropertiesPage').then((m) => ({ default: m.PropertiesPage })),
)
const HousekeepingPage = lazy(() =>
  import('@/features/housekeeping/HousekeepingPage').then((m) => ({ default: m.HousekeepingPage })),
)
const TransportPage = lazy(() =>
  import('@/features/transport/TransportPage').then((m) => ({ default: m.TransportPage })),
)
const ActivitiesPage = lazy(() =>
  import('@/features/activities/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage })),
)
const BillingPage = lazy(() =>
  import('@/features/billing/BillingPage').then((m) => ({ default: m.BillingPage })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const SetupPage = lazy(() =>
  import('@/features/setup/SetupPage').then((m) => ({ default: m.SetupPage })),
)

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<div>Loading...</div>}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/setup',
    element: withSuspense(<SetupPage />),
  },
  {
    path: '/',
    element: <App />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { index: true, element: withSuspense(<DashboardPage />) },
          { path: 'guests', element: withSuspense(<GuestsPage />) },
          { path: 'reservations', element: withSuspense(<ReservationsPage />) },
          { path: 'properties', element: withSuspense(<PropertiesPage />) },
          { path: 'housekeeping', element: withSuspense(<HousekeepingPage />) },
          { path: 'transport', element: withSuspense(<TransportPage />) },
          { path: 'activities', element: withSuspense(<ActivitiesPage />) },
          { path: 'billing', element: withSuspense(<BillingPage />) },
          { path: 'settings', element: withSuspense(<SettingsPage />) },
        ],
      },
    ],
  },
])
