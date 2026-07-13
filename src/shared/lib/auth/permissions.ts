export const Permissions = {
  Bookings: {
    ViewOwn:         'bookings.view_own',
    ViewAll:         'bookings.view_all',
    Create:          'bookings.create',
    ManageLineItems: 'bookings.manage_line_items',
  },
  Discounts: {
    Request: 'discounts.request',
    Approve: 'discounts.approve',
  },
  Fleet: {
    View:   'fleet.view',
    Manage: 'fleet.manage',
  },
  Transfers: {
    Assign:  'transfers.assign',
    ViewOwn: 'transfers.view_own',
  },
  MasterData: {
    View:   'master_data.view',
    Manage: 'master_data.manage',
  },
  Reports: {
    View: 'reports.view',
  },
  Settings: {
    Users: 'settings.users',
  },
  ServiceLogs: {
    Manage: 'service_logs.manage',
  },
} as const
