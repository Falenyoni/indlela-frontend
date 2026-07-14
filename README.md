# Indlela — Frontend

React + Vite + TypeScript frontend for the Indlela tour operator booking system.

---

## Stack

| Concern | Library |
|---|---|
| Framework | React 19 + Vite 8 |
| Language | TypeScript 6 |
| Routing | React Router 7 |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Styles | Tailwind CSS v4 |

---

## Getting started

```bash
npm install
npm run dev
```

The dev server proxies `/api` to the backend. Set the target in `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': 'https://localhost:7001'
  }
}
```

Build for production:

```bash
npm run build
```

---

## Project structure

```
src/
├── app/
│   ├── layout/
│   │   └── Sidebar.tsx          # Permission-filtered nav, org name, user roles
│   └── router.tsx               # All routes wrapped with PermissionGuard
├── features/
│   ├── auth/                    # LoginPage, authApi, token storage
│   ├── reservations/            # ReservationsPage, reservationsApi, discountRequestsApi
│   ├── agents/                  # AgentsPage, agentsApi (includes rate sheets)
│   ├── activities/              # ActivitiesPage, activitiesApi
│   ├── transport/               # TransferRoutesPage, TransportPage, transfersApi, transportApi
│   ├── guests/                  # GuestsPage, guestsApi
│   ├── locations/               # LocationsPage, locationsApi
│   ├── properties/              # PropertiesPage, propertiesApi
│   ├── suppliers/               # SuppliersPage, suppliersApi
│   ├── settings/                # SettingsPage (Users + Roles tabs), settingsApi
│   └── reporting/               # ReportingPage
└── shared/
    └── lib/
        ├── api/
        │   └── apiFetch.ts          # Fetch wrapper — injects Bearer token, handles 401
        └── auth/
            ├── AuthContext.tsx      # useAuth() — user, hasPermission(), hasAnyRole()
            ├── permissions.ts       # Typed permission key constants
            └── PermissionGuard.tsx  # Redirects to / if permission missing
```

---

## Auth

After login, the JWT is stored in `localStorage`. `apiFetch` injects it on every request. On 401, the user is redirected to `/login`.

```ts
const { user, hasPermission, hasAnyRole } = useAuth()

hasPermission(Permissions.Bookings.ViewAll)   // true/false
hasAnyRole('Admin', 'Supervisor')              // true/false
```

Permission constants are in `src/shared/lib/auth/permissions.ts` — always use these, never raw strings.

---

## Route guards

Every route in `router.tsx` is wrapped with `PermissionGuard`:

```tsx
// helper in router.tsx
const guard = (perms: string[], el: JSX.Element) => (
  <PermissionGuard anyPermission={perms}>{el}</PermissionGuard>
)
```

The sidebar filters itself with the same permission check — users never see nav items they can't access.

---

## API conventions

- All calls go through `apiFetch` in `src/shared/lib/api/apiFetch.ts`
- Each feature has its own `*Api.ts` with typed async functions — no raw `fetch` in components
- All mutations use `POST` (matching the backend convention)
- Queries use TanStack Query with consistent `queryKey` arrays

---

## Line item product types

When adding a line item to a booking the `productType` drives the product picker:

| Type | Source endpoint |
|---|---|
| `Accommodation` | `GET /api/property-types` |
| `Transfer` | `GET /api/transfer-routes` |
| `Activity` | `GET /api/activities` (all non-ParkFee/Helicopter) |
| `ParkFee` | `GET /api/activities?category=ParkFee` |
| `Helicopter` | `GET /api/activities?category=Helicopter` |
| `Other` | Free text, no product lookup |

Selecting a product auto-fills `description`, `rackRate`, and `childRackRate`. Agent selling rates are applied server-side from the rate sheet — there is no `agentDiscountPercent` field on the form.

---

## Pending pages

| Page | Status |
|---|---|
| Vehicle management | Not yet built |
| Driver management | Not yet built |
| Transfer requests dispatch board | Not yet built |
| Agent rate sheet management (on Agents page) | Not yet built |
| Discount request approval queue | Not yet built |
| Activities — child price + ParkFee/Helicopter category options | Not yet built |
