import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsers, createUser, updateUser, assignUserRoles,
  getRoles, createRole, updateRole, getPermissions,
  type UserRow, type RoleRow,
} from './settingsApi'

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

// ── SettingsPage ──────────────────────────────────────────────────────────────

type Tab = 'users' | 'roles'

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('users')

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: getRoles })
  const { data: allPermissions = [] } = useQuery({ queryKey: ['permissions'], queryFn: getPermissions })

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t
      ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm border border-gray-200 dark:border-gray-800'
      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Organisation users, roles, and access permissions</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('users')} className={tabCls('users')}>Users</button>
        <button onClick={() => setTab('roles')} className={tabCls('roles')}>Roles & Permissions</button>
      </div>

      {tab === 'users' && <UsersTab roles={roles} />}
      {tab === 'roles' && <RolesTab allPermissions={allPermissions} />}
    </div>
  )
}
