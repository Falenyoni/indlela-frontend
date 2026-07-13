import { createBrowserRouter } from 'react-router'
import { lazy, Suspense } from 'react'
import App from '@/App'
import { ProtectedRoute } from '@/shared/lib/auth/ProtectedRoute'
import { PermissionGuard } from '@/shared/lib/auth/PermissionGuard'
import { Permissions } from '@/shared/lib/auth/permissions'

const DashboardPage    = lazy(() => import('@/app/DashboardPage').then(m => ({ default: m.DashboardPage })))
const GuestsPage       = lazy(() => import('@/features/guests/GuestsPage').then(m => ({ default: m.GuestsPage })))
const ReservationsPage = lazy(() => import('@/features/reservations/ReservationsPage').then(m => ({ default: m.ReservationsPage })))
const PropertiesPage   = lazy(() => import('@/features/properties/PropertiesPage').then(m => ({ default: m.PropertiesPage })))
const HousekeepingPage = lazy(() => import('@/features/housekeeping/HousekeepingPage').then(m => ({ default: m.HousekeepingPage })))
const TransportPage    = lazy(() => import('@/features/transport/TransportPage').then(m => ({ default: m.TransportPage })))
const ActivitiesPage   = lazy(() => import('@/features/activities/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })))
const SuppliersPage    = lazy(() => import('@/features/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const LocationsPage    = lazy(() => import('@/features/locations/LocationsPage').then(m => ({ default: m.LocationsPage })))
const AgentsPage       = lazy(() => import('@/features/agents/AgentsPage').then(m => ({ default: m.AgentsPage })))
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
const transport = [Permissions.Transfers.Assign, Permissions.Transfers.ViewOwn, Permissions.Fleet.View]
const master    = [Permissions.MasterData.View]
const admin     = [Permissions.Settings.Users]

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
          { path: 'reservations',     element: guard(bookings,  <ReservationsPage />) },
          { path: 'transport',        element: guard(transport, <TransportPage />) },
          { path: 'activities',       element: guard(master,    <ActivitiesPage />) },
          { path: 'properties',       element: guard(master,    <PropertiesPage />) },
          { path: 'housekeeping',     element: guard(master,    <HousekeepingPage />) },
          { path: 'suppliers',        element: guard(master,    <SuppliersPage />) },
          { path: 'locations',        element: guard(master,    <LocationsPage />) },
          { path: 'agents',           element: guard(master,    <AgentsPage />) },
          { path: 'billing',          element: guard(admin,     <BillingPage />) },
          { path: 'reporting',        element: guard([Permissions.Reports.View], <ReportingPage />) },
          { path: 'settings',         element: guard(admin,     <SettingsPage />) },
        ],
      },
    ],
  },
])
