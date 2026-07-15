import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsers, createUser, updateUser, assignUserRoles,
  getRoles, createRole, updateRole, getPermissions,
  type UserRow, type RoleRow,
} from './settingsApi'
import {
  getVehicleTypes, createVehicleType, updateVehicleType, toggleVehicleType,
  getVehicleMakes, createVehicleMake, updateVehicleMake, toggleVehicleMake,
  getVehicleModels, createVehicleModel, updateVehicleModel, toggleVehicleModel,
  getVehicles, createVehicle, updateVehicle, toggleVehicle,
  getDrivers, createDriver, updateDriver, toggleDriver,
  type VehicleMakeRow, type VehicleModelRow,
  type VehicleRow, type VehiclePayload, type DriverRow, type DriverPayload,
} from '../transport/transportApi'
import { ActivitiesPage } from '../activities/ActivitiesPage'
import { PropertiesPage } from '../properties/PropertiesPage'
import { SuppliersPage } from '../suppliers/SuppliersPage'
import { AgentsPage } from '../agents/AgentsPage'
import { LocationsPage } from '../locations/LocationsPage'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_BADGE = 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'

function groupPermissions(keys: string[]): Record<string, string[]> {
  return keys.reduce<Record<string, string[]>>((acc, key) => {
    const [group] = key.split('.')
    ;(acc[group] ??= []).push(key)
    return acc
  }, {})
}

function permissionLabel(key: string): string {
  return key.split('.').slice(1).join(' ').replace(/_/g, ' ')
}

function groupLabel(group: string): string {
  const map: Record<string, string> = {
    bookings: 'Bookings',
    discounts: 'Discounts',
    fleet: 'Fleet',
    transfers: 'Transfers',
    master_data: 'Master Data',
    reports: 'Reports',
    settings: 'Settings',
    service_logs: 'Service Logs',
  }
  return map[group] ?? group
}

const inputCls = 'w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

// ── Users Tab ─────────────────────────────────────────────────────────────────

const emptyCreate = { firstName: '', lastName: '', email: '', password: '', roleIds: [] as string[] }

function UsersTab({ roles }: { roles: RoleRow[] }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', isActive: true })
  const [assignUser, setAssignUser] = useState<UserRow | null>(null)
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([])

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => getUsers(search || undefined),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const create = useMutation({
    mutationFn: () => createUser(createForm),
    onSuccess: () => { setShowCreate(false); setCreateForm(emptyCreate); invalidate() },
  })

  const save = useMutation({
    mutationFn: () => updateUser(editUser!.id, editForm),
    onSuccess: () => { setEditUser(null); invalidate() },
  })

  const assignRoles = useMutation({
    mutationFn: () => assignUserRoles(assignUser!.id, assignedRoleIds),
    onSuccess: () => { setAssignUser(null); invalidate() },
  })

  const openEdit = (u: UserRow) => {
    const [firstName = '', ...rest] = u.fullName.split(' ')
    setEditUser(u)
    setEditForm({ firstName, lastName: rest.join(' '), isActive: u.status === 'Active' })
  }

  const openAssign = (u: UserRow) => {
    setAssignUser(u)
    setAssignedRoleIds(roles.filter(r => u.roles.includes(r.name)).map(r => r.id))
  }

  const toggleCreateRole = (id: string) =>
    setCreateForm(f => ({
      ...f,
      roleIds: f.roleIds.includes(id) ? f.roleIds.filter(x => x !== id) : [...f.roleIds, id],
    }))

  const toggleAssignRole = (id: string) =>
    setAssignedRoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const canCreate = createForm.firstName && createForm.lastName && createForm.email && createForm.password && createForm.roleIds.length > 0

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
          className={`${inputCls} max-w-sm`} />
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add User
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>{['Name', 'Email', 'Roles', 'Status', 'Joined', ''].map(h =>
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{u.fullName}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length > 0
                        ? u.roles.map(r => <span key={r} className={ROLE_BADGE}>{r}</span>)
                        : <span className="text-gray-400 text-xs">No roles</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openAssign(u)} className="text-xs text-purple-600 hover:underline">Roles</button>
                      <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add User</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First Name *</label>
                <input value={createForm.firstName} onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Last Name *</label>
                <input value={createForm.lastName} onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Temporary Password *</label>
              <input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Roles * (select one or more)</label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800 max-h-40 overflow-y-auto">
                {roles.filter(r => r.isActive).map(r => (
                  <label key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input type="checkbox" checked={createForm.roleIds.includes(r.id)} onChange={() => toggleCreateRole(r.id)}
                      className="rounded border-gray-300" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{r.name}</span>
                    {r.description && <span className="text-xs text-gray-400 ml-auto">{r.description}</span>}
                  </label>
                ))}
              </div>
            </div>

            {create.isError && <p className="text-sm text-red-500">{String(create.error)}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => create.mutate()} disabled={create.isPending || !canCreate}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {create.isPending ? 'Creating…' : 'Create User'}
              </button>
              <button onClick={() => { setShowCreate(false); setCreateForm(emptyCreate) }}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit User</h3>
            <p className="text-xs text-gray-400">{editUser.email}</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First Name</label>
                <input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select value={editForm.isActive ? 'Active' : 'Inactive'}
                onChange={e => setEditForm(f => ({ ...f, isActive: e.target.value === 'Active' }))}
                className={inputCls}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => save.mutate()} disabled={save.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditUser(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Roles Modal */}
      {assignUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Assign Roles</h3>
              <p className="text-xs text-gray-400">{assignUser.fullName} · {assignUser.email}</p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
              {roles.filter(r => r.isActive).map(r => (
                <label key={r.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <input type="checkbox" checked={assignedRoleIds.includes(r.id)} onChange={() => toggleAssignRole(r.id)}
                    className="mt-0.5 rounded border-gray-300" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</p>
                    {r.description && <p className="text-xs text-gray-400">{r.description}</p>}
                  </div>
                </label>
              ))}
            </div>

            {assignRoles.isError && <p className="text-sm text-red-500">{String(assignRoles.error)}</p>}

            <div className="flex gap-3">
              <button onClick={() => assignRoles.mutate()} disabled={assignRoles.isPending || assignedRoleIds.length === 0}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {assignRoles.isPending ? 'Saving…' : 'Save Roles'}
              </button>
              <button onClick={() => setAssignUser(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────

const emptyRole = { name: '', description: '', permissions: [] as string[], isActive: true }

function RolesTab({ allPermissions }: { allPermissions: string[] }) {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyRole)
  const [editRole, setEditRole] = useState<RoleRow | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', permissions: [] as string[], isActive: true })

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['roles'] })

  const create = useMutation({
    mutationFn: () => createRole(createForm),
    onSuccess: () => { setShowCreate(false); setCreateForm(emptyRole); invalidate() },
  })

  const save = useMutation({
    mutationFn: () => updateRole(editRole!.id, editForm),
    onSuccess: () => { setEditRole(null); invalidate() },
  })

  const openEdit = (r: RoleRow) => {
    setEditRole(r)
    setEditForm({ name: r.name, description: r.description ?? '', permissions: [...r.permissions], isActive: r.isActive })
  }

  const grouped = groupPermissions(allPermissions)

  const togglePerm = (key: string, setter: React.Dispatch<React.SetStateAction<typeof emptyRole>>) =>
    setter(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }))

  const togglePermEdit = (key: string) =>
    setEditForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }))

  const PermissionGrid = ({
    selected,
    onToggle,
    readOnly,
  }: {
    selected: string[]
    onToggle: (key: string) => void
    readOnly?: boolean
  }) => (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {Object.entries(grouped).map(([group, keys]) => (
        <div key={group}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{groupLabel(group)}</p>
          <div className="space-y-1">
            {keys.map(key => (
              <label key={key} className={`flex items-center gap-2 text-sm ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                <input type="checkbox" checked={selected.includes(key)} onChange={() => !readOnly && onToggle(key)}
                  disabled={readOnly} className="rounded border-gray-300" />
                <span className="capitalize text-gray-700 dark:text-gray-300">{permissionLabel(key)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Role
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="grid gap-3">
          {roles.map(r => (
            <div key={r.id} className={`bg-white dark:bg-gray-900 rounded-lg border p-4 ${r.isActive ? 'border-gray-200 dark:border-gray-800' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</h4>
                    {r.isSystem && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">System</span>}
                    {!r.isActive && <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Inactive</span>}
                  </div>
                  {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                </div>
                {!r.isSystem && (
                  <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline shrink-0 ml-4">Edit</button>
                )}
              </div>
              {r.permissions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.permissions.map(p => (
                    <span key={p} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Role</h3>

            <div>
              <label className={labelCls}>Role Name *</label>
              <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Senior Consultant" />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Optional description" />
            </div>

            <div>
              <label className={labelCls}>Permissions</label>
              <PermissionGrid selected={createForm.permissions} onToggle={k => togglePerm(k, setCreateForm)} />
            </div>

            {create.isError && <p className="text-sm text-red-500">{String(create.error)}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => create.mutate()} disabled={create.isPending || !createForm.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {create.isPending ? 'Creating…' : 'Create Role'}
              </button>
              <button onClick={() => { setShowCreate(false); setCreateForm(emptyRole) }}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Role</h3>

            <div>
              <label className={labelCls}>Role Name *</label>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select value={editForm.isActive ? 'Active' : 'Inactive'}
                onChange={e => setEditForm(f => ({ ...f, isActive: e.target.value === 'Active' }))}
                className={inputCls}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Permissions</label>
              <PermissionGrid selected={editForm.permissions} onToggle={togglePermEdit} />
            </div>

            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => save.mutate()} disabled={save.isPending || !editForm.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditRole(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Fleet Setup Tab ───────────────────────────────────────────────────────────

function RefList({
  title, items, isLoading, newName, onNewName, onAdd, onRename, onToggle, isPendingAdd, isPendingToggle, error,
}: {
  title: string
  items: { id: string; name: string; isActive: boolean }[]
  isLoading: boolean
  newName: string
  onNewName: (v: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onToggle: (id: string) => void
  isPendingAdd: boolean
  isPendingToggle: boolean
  error?: string
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const startEdit = (item: { id: string; name: string }) => { setEditingId(item.id); setEditName(item.name) }
  const commitEdit = () => { if (editName.trim() && editingId) onRename(editingId, editName.trim()); setEditingId(null) }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="flex gap-2">
        <input value={newName} onChange={e => onNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && newName.trim() && onAdd()}
          placeholder={`Add ${title.toLowerCase()}…`} className={inputCls} />
        <button onClick={onAdd} disabled={isPendingAdd || !newName.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0">
          {isPendingAdd ? '…' : '+ Add'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading && <p className="px-4 py-6 text-sm text-center text-gray-400">Loading…</p>}
        {!isLoading && items.length === 0 && <p className="px-4 py-6 text-sm text-center text-gray-400">No {title.toLowerCase()} yet</p>}
        {items.map((item, i) => (
          <div key={item.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''} ${!item.isActive ? 'opacity-50' : ''}`}>
            {editingId === item.id ? (
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                className="text-sm border border-blue-400 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
              />
            ) : (
              <span className="text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
            )}
            <div className="flex items-center gap-3">
              <span className={`px-1.5 py-0.5 rounded text-xs ${item.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                {item.isActive ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => startEdit(item)}
                className="text-xs text-blue-500 hover:underline">
                Edit
              </button>
              <button onClick={() => onToggle(item.id)} disabled={isPendingToggle}
                className={`text-xs hover:underline ${item.isActive ? 'text-red-500' : 'text-green-600'}`}>
                {item.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FleetSetupTab() {
  const qc = useQueryClient()
  const [selectedMake, setSelectedMake] = useState<VehicleMakeRow | null>(null)
  const [newTypeName, setNewTypeName] = useState('')
  const [newMakeName, setNewMakeName] = useState('')
  const [newModelName, setNewModelName] = useState('')
  const [editingMakeId, setEditingMakeId] = useState<string | null>(null)
  const [editMakeName, setEditMakeName] = useState('')
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [editModelName, setEditModelName] = useState('')

  const { data: types = [], isLoading: typesLoading } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: () => getVehicleTypes(),
  })

  const { data: makes = [], isLoading: makesLoading } = useQuery({
    queryKey: ['vehicle-makes'],
    queryFn: () => getVehicleMakes(),
  })

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['vehicle-models', selectedMake?.id],
    queryFn: () => getVehicleModels(selectedMake!.id),
    enabled: !!selectedMake,
  })

  const addType = useMutation({
    mutationFn: () => createVehicleType(newTypeName.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-types'] }); setNewTypeName('') },
  })
  const renameType = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateVehicleType(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-types'] }),
  })
  const toggleType = useMutation({
    mutationFn: (id: string) => toggleVehicleType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-types'] }),
  })

  const addMake = useMutation({
    mutationFn: () => createVehicleMake(newMakeName.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-makes'] }); setNewMakeName('') },
  })
  const renameMake = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateVehicleMake(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-makes'] }),
  })
  const toggleMake = useMutation({
    mutationFn: (id: string) => toggleVehicleMake(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-makes'] }),
  })

  const addModel = useMutation({
    mutationFn: () => createVehicleModel(selectedMake!.id, newModelName.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-models', selectedMake?.id] }); setNewModelName('') },
  })
  const renameModel = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateVehicleModel(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-models', selectedMake?.id] }),
  })
  const toggleModel = useMutation({
    mutationFn: (id: string) => toggleVehicleModel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-models', selectedMake?.id] }),
  })

  return (
    <div className="space-y-8">
      {/* Vehicle Types — full width */}
      <RefList
        title="Vehicle Types"
        items={types}
        isLoading={typesLoading}
        newName={newTypeName}
        onNewName={setNewTypeName}
        onAdd={() => addType.mutate()}
        onRename={(id, name) => renameType.mutate({ id, name })}
        onToggle={id => toggleType.mutate(id)}
        isPendingAdd={addType.isPending}
        isPendingToggle={toggleType.isPending}
        error={addType.isError ? String(addType.error) : undefined}
      />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Makes — clickable to filter models */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Vehicle Makes</h3>
        <div className="flex gap-2">
          <input value={newMakeName} onChange={e => setNewMakeName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && newMakeName.trim() && addMake.mutate()}
            placeholder="Add make…" className={inputCls} />
          <button onClick={() => addMake.mutate()} disabled={addMake.isPending || !newMakeName.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0">
            {addMake.isPending ? '…' : '+ Add'}
          </button>
        </div>
        {addMake.isError && <p className="text-xs text-red-500">{String(addMake.error)}</p>}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          {makesLoading && <p className="px-4 py-6 text-sm text-center text-gray-400">Loading…</p>}
          {!makesLoading && makes.length === 0 && <p className="px-4 py-6 text-sm text-center text-gray-400">No makes yet</p>}
          {makes.map((m, i) => (
            <div key={m.id} onClick={() => editingMakeId !== m.id && setSelectedMake(selectedMake?.id === m.id ? null : m)}
              className={`flex items-center justify-between px-4 py-2.5 cursor-pointer
                ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}
                ${selectedMake?.id === m.id ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                ${!m.isActive ? 'opacity-50' : ''}`}>
              {editingMakeId === m.id ? (
                <input
                  autoFocus
                  value={editMakeName}
                  onChange={e => setEditMakeName(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onBlur={() => { renameMake.mutate({ id: m.id, name: editMakeName.trim() }); setEditingMakeId(null) }}
                  onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { renameMake.mutate({ id: m.id, name: editMakeName.trim() }); setEditingMakeId(null) } if (e.key === 'Escape') setEditingMakeId(null) }}
                  className="text-sm border border-blue-400 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
                />
              ) : (
                <span className={`text-sm font-medium ${selectedMake?.id === m.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {m.name}
                </span>
              )}
              <div className="flex items-center gap-3">
                <span className={`px-1.5 py-0.5 rounded text-xs ${m.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {m.isActive ? 'Active' : 'Inactive'}
                </span>
                <button onClick={e => { e.stopPropagation(); setEditingMakeId(m.id); setEditMakeName(m.name) }}
                  className="text-xs text-blue-500 hover:underline">
                  Edit
                </button>
                <button onClick={e => { e.stopPropagation(); toggleMake.mutate(m.id) }} disabled={toggleMake.isPending}
                  className={`text-xs hover:underline ${m.isActive ? 'text-red-500' : 'text-green-600'}`}>
                  {m.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
        {selectedMake && <p className="text-xs text-blue-600 dark:text-blue-400">Showing models for <strong>{selectedMake.name}</strong> →</p>}
      </div>

      {/* Models */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Models{selectedMake
            ? <span className="text-gray-400 font-normal"> — {selectedMake.name}</span>
            : <span className="text-gray-400 font-normal text-sm"> (select a make)</span>}
        </h3>
        {selectedMake ? (
          <>
            <div className="flex gap-2">
              <input value={newModelName} onChange={e => setNewModelName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newModelName.trim() && addModel.mutate()}
                placeholder="Add model…" className={inputCls} />
              <button onClick={() => addModel.mutate()} disabled={addModel.isPending || !newModelName.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0">
                {addModel.isPending ? '…' : '+ Add'}
              </button>
            </div>
            {addModel.isError && <p className="text-xs text-red-500">{String(addModel.error)}</p>}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              {modelsLoading && <p className="px-4 py-6 text-sm text-center text-gray-400">Loading…</p>}
              {!modelsLoading && models.length === 0 && <p className="px-4 py-6 text-sm text-center text-gray-400">No models for {selectedMake.name} yet</p>}
              {models.map((m: VehicleModelRow, i: number) => (
                <div key={m.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''} ${!m.isActive ? 'opacity-50' : ''}`}>
                  {editingModelId === m.id ? (
                    <input
                      autoFocus
                      value={editModelName}
                      onChange={e => setEditModelName(e.target.value)}
                      onBlur={() => { renameModel.mutate({ id: m.id, name: editModelName.trim() }); setEditingModelId(null) }}
                      onKeyDown={e => { if (e.key === 'Enter') { renameModel.mutate({ id: m.id, name: editModelName.trim() }); setEditingModelId(null) } if (e.key === 'Escape') setEditingModelId(null) }}
                      className="text-sm border border-blue-400 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
                    />
                  ) : (
                    <span className="text-sm text-gray-900 dark:text-gray-100">{m.name}</span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${m.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => { setEditingModelId(m.id); setEditModelName(m.name) }}
                      className="text-xs text-blue-500 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => toggleModel.mutate(m.id)} disabled={toggleModel.isPending}
                      className={`text-xs hover:underline ${m.isActive ? 'text-red-500' : 'text-green-600'}`}>
                      {m.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-4 py-10 text-center text-sm text-gray-400">
            Click a make on the left to manage its models
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

// ── Fleet Tab ─────────────────────────────────────────────────────────────────

const emptyVehicle: VehiclePayload = { registration: '', make: '', model: '', vehicleType: '', capacity: 1 }

function FleetTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<VehicleRow | null>(null)
  const [form, setForm] = useState<VehiclePayload>(emptyVehicle)
  const [selectedMakeId, setSelectedMakeId] = useState('')

  const { data: vehicles = [], isLoading } = useQuery({ queryKey: ['vehicles', search], queryFn: () => getVehicles(search || undefined) })
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicle-types'], queryFn: () => getVehicleTypes(true), enabled: showForm })
  const { data: makes = [] } = useQuery({ queryKey: ['vehicle-makes'], queryFn: () => getVehicleMakes(true), enabled: showForm })
  const { data: models = [] } = useQuery({ queryKey: ['vehicle-models', selectedMakeId], queryFn: () => getVehicleModels(selectedMakeId, true), enabled: showForm && !!selectedMakeId })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vehicles'] })
  const save = useMutation({
    mutationFn: () => editing ? updateVehicle(editing.id, form) : createVehicle(form).then(() => undefined),
    onSuccess: () => { invalidate(); closeForm() },
  })
  const toggle = useMutation({ mutationFn: (id: string) => toggleVehicle(id), onSuccess: invalidate })

  const openCreate = () => { setEditing(null); setForm(emptyVehicle); setSelectedMakeId(''); setShowForm(true) }
  const openEdit = (v: VehicleRow) => {
    setEditing(v)
    setForm({ registration: v.registration, make: v.make, model: v.model, vehicleType: v.vehicleType, capacity: v.capacity })
    setSelectedMakeId(makes.find(m => m.name === v.make)?.id ?? '')
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyVehicle); setSelectedMakeId('') }
  const isValid = form.registration.trim() && form.make.trim() && form.model.trim() && form.vehicleType && form.capacity > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input placeholder="Search fleet…" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} max-w-sm`} />
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">+ Add Vehicle</button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>{['Registration', 'Make / Model', 'Type', 'Capacity', 'Status', ''].map(h =>
              <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>}
            {!isLoading && vehicles.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No vehicles yet</td></tr>}
            {vehicles.map(v => (
              <tr key={v.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!v.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">{v.registration}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{v.make} {v.model}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">{v.vehicleType}</span></td>
                <td className="px-4 py-3 text-gray-500">{v.capacity} pax</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => openEdit(v)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggle.mutate(v.id)} disabled={toggle.isPending}
                      className={`text-xs hover:underline ${v.isActive ? 'text-red-500' : 'text-green-600'}`}>
                      {v.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Registration *</label>
                <input value={form.registration} onChange={e => setForm(f => ({ ...f, registration: e.target.value.toUpperCase() }))} placeholder="e.g. ZW 123 ABC" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Make *</label>
                  {makes.length > 0 ? (
                    <select value={selectedMakeId} onChange={e => { const m = makes.find(x => x.id === e.target.value); setSelectedMakeId(e.target.value); setForm(f => ({ ...f, make: m?.name ?? '', model: '' })) }} className={inputCls}>
                      <option value="">Select make…</option>
                      {makes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  ) : (
                    <input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="Add makes in Fleet Setup" className={inputCls} />
                  )}
                </div>
                <div>
                  <label className={labelCls}>Model *</label>
                  {selectedMakeId && models.length > 0 ? (
                    <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className={inputCls}>
                      <option value="">Select model…</option>
                      {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  ) : (
                    <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder={selectedMakeId ? 'No models yet' : 'Select a make first'} className={inputCls} />
                  )}
                </div>
                <div>
                  <label className={labelCls}>Vehicle Type *</label>
                  <select value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))} className={inputCls}>
                    <option value="">Select…</option>
                    {vehicleTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    {vehicleTypes.length === 0 && <option disabled>Add types in Fleet Setup</option>}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Capacity (pax) *</label>
                  <input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} className={inputCls} />
                </div>
              </div>
            </div>
            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => save.mutate()} disabled={save.isPending || !isValid}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Vehicle'}
              </button>
              <button onClick={closeForm} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Drivers Tab ───────────────────────────────────────────────────────────────

const emptyDriver: DriverPayload = { fullName: '', licenseNumber: '', phone: null, userId: null }

function DriversTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DriverRow | null>(null)
  const [form, setForm] = useState<DriverPayload>(emptyDriver)

  const { data: drivers = [], isLoading } = useQuery({ queryKey: ['drivers', search], queryFn: () => getDrivers(search || undefined) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => getUsers(), enabled: showForm })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['drivers'] })
  const save = useMutation({
    mutationFn: () => editing ? updateDriver(editing.id, form) : createDriver(form).then(() => undefined),
    onSuccess: () => { invalidate(); closeForm() },
  })
  const toggle = useMutation({ mutationFn: (id: string) => toggleDriver(id), onSuccess: invalidate })

  const openCreate = () => { setEditing(null); setForm(emptyDriver); setShowForm(true) }
  const openEdit = (d: DriverRow) => {
    setEditing(d)
    setForm({ fullName: d.fullName, licenseNumber: d.licenseNumber, phone: d.phone, userId: d.userId })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyDriver) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input placeholder="Search drivers…" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} max-w-sm`} />
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">+ Add Driver</button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>{['Name', 'License', 'Phone', 'Type', 'Status', ''].map(h =>
              <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>}
            {!isLoading && drivers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No drivers yet</td></tr>}
            {drivers.map(d => (
              <tr key={d.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!d.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{d.fullName}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.licenseNumber}</td>
                <td className="px-4 py-3 text-gray-500">{d.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.isInternal ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {d.isInternal ? 'Internal' : 'Subcontracted'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                    {d.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => openEdit(d)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggle.mutate(d.id)} disabled={toggle.isPending}
                      className={`text-xs hover:underline ${d.isActive ? 'text-red-500' : 'text-green-600'}`}>
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">{drivers.length} driver{drivers.length !== 1 ? 's' : ''}</div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Driver' : 'Add Driver'}</h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Tendai Moyo" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>License Number *</label>
                  <input value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="e.g. 18-123456" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value || null }))} placeholder="+263 77 000 0000" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Link to user account <span className="text-gray-400 font-normal">(optional — for internal drivers with tablets)</span></label>
                <select value={form.userId ?? ''} onChange={e => setForm(f => ({ ...f, userId: e.target.value || null }))} className={inputCls}>
                  <option value="">Subcontracted — no system account</option>
                  {users.map((u: UserRow) => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>
            {save.isError && <p className="text-sm text-red-500">{String(save.error)}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => save.mutate()} disabled={save.isPending || !form.fullName.trim() || !form.licenseNumber.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Driver'}
              </button>
              <button onClick={closeForm} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SettingsPage ──────────────────────────────────────────────────────────────

type Tab =
  | 'users' | 'roles'
  | 'activities' | 'properties' | 'suppliers' | 'agents' | 'locations'
  | 'fleet' | 'drivers' | 'fleet-setup'

const TAB_GROUPS = [
  {
    label: 'Access',
    tabs: [
      { id: 'users',  label: 'Users' },
      { id: 'roles',  label: 'Roles & Permissions' },
    ],
  },
  {
    label: 'Product Catalog',
    tabs: [
      { id: 'activities',  label: 'Activities' },
      { id: 'properties',  label: 'Properties' },
      { id: 'suppliers',   label: 'Suppliers' },
      { id: 'agents',      label: 'Agents' },
      { id: 'locations',   label: 'Locations' },
    ],
  },
  {
    label: 'Fleet',
    tabs: [
      { id: 'fleet',       label: 'Fleet' },
      { id: 'drivers',     label: 'Drivers' },
      { id: 'fleet-setup', label: 'Fleet Setup' },
    ],
  },
] as const

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('users')

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: getRoles })
  const { data: allPermissions = [] } = useQuery({ queryKey: ['permissions'], queryFn: getPermissions })

  const tabCls = (t: Tab) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${tab === t
      ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm border border-gray-200 dark:border-gray-800'
      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Users, product catalog, fleet, and reference data</p>
      </div>

      <div className="flex flex-wrap gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
        {TAB_GROUPS.map(group => (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1">{group.label}</span>
            <div className="flex flex-wrap gap-1">
              {group.tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id as Tab)} className={tabCls(t.id as Tab)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {tab === 'users'       && <UsersTab roles={roles} />}
      {tab === 'roles'       && <RolesTab allPermissions={allPermissions} />}
      {tab === 'activities'  && <ActivitiesPage />}
      {tab === 'properties'  && <PropertiesPage />}
      {tab === 'suppliers'   && <SuppliersPage />}
      {tab === 'agents'      && <AgentsPage />}
      {tab === 'locations'   && <LocationsPage />}
      {tab === 'fleet'       && <FleetTab />}
      {tab === 'drivers'     && <DriversTab />}
      {tab === 'fleet-setup' && <FleetSetupTab />}
    </div>
  )
}
