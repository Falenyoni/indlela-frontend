import { useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import { createAgent } from './agentsApi'

const COLUMNS = [
  { key: 'name',            label: 'Name',              required: true },
  { key: 'contactPerson',   label: 'Contact Person',    hint: 'Optional' },
  { key: 'email',           label: 'Email',             hint: 'Optional' },
  { key: 'phone',           label: 'Phone',             hint: 'Optional' },
  { key: 'discountPercent', label: 'Discount %',        required: true, hint: 'e.g. 10 (for 10%)' },
  { key: 'creditTermDays',  label: 'Credit Term Days',  required: true, hint: 'e.g. 30' },
  { key: 'creditLimit',     label: 'Credit Limit',      required: true, hint: 'e.g. 5000' },
  { key: 'notes',           label: 'Notes',             hint: 'Optional' },
]

export function AgentImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const onSubmitRow = async (row: Record<string, string>) => {
    await createAgent({
      name:            row.name,
      contactPerson:   row.contactPerson || null,
      email:           row.email || null,
      phone:           row.phone || null,
      discountPercent: parseFloat(row.discountPercent) || 0,
      creditTermDays:  row.creditTermDays ? parseInt(row.creditTermDays, 10) : 30,
      creditLimit:     parseFloat(row.creditLimit) || 0,
      notes:           row.notes || null,
    })
  }

  return (
    <BulkUploadModal
      title="Import Agents"
      columns={COLUMNS}
      templateFileName="indlela-agents-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => qc.invalidateQueries({ queryKey: ['agents'] })}
      rowLabel={(row) => row.name}
    />
  )
}
