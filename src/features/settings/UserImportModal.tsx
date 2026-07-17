import { useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import { createUser, type RoleRow } from './settingsApi'

const COLUMNS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName',  label: 'Last Name',  required: true },
  { key: 'email',     label: 'Email',      required: true },
  { key: 'password',  label: 'Password',   required: true, hint: 'Min 8 characters' },
  { key: 'roleName',  label: 'Role',       required: true, hint: 'Must match an existing role name exactly' },
]

interface Props {
  roles: RoleRow[]
  onClose: () => void
}

export function UserImportModal({ roles, onClose }: Props) {
  const qc = useQueryClient()

  const roleMap = Object.fromEntries(roles.map(r => [r.name.toLowerCase(), r.id]))

  const onSubmitRow = async (row: Record<string, string>) => {
    const roleId = roleMap[row.roleName.toLowerCase()]
    if (!roleId) {
      const available = roles.map(r => r.name).join(', ')
      throw new Error(`Role "${row.roleName}" not found. Available: ${available}`)
    }
    await createUser({
      firstName: row.firstName,
      lastName:  row.lastName,
      email:     row.email,
      password:  row.password,
      roleIds:   [roleId],
    })
  }

  return (
    <BulkUploadModal
      title="Import Users"
      columns={COLUMNS}
      templateFileName="indlela-users-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => qc.invalidateQueries({ queryKey: ['users'] })}
      rowLabel={(row) => `${row.firstName} ${row.lastName} (${row.email})`}
    />
  )
}
