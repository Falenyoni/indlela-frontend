import { useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import { createDriver } from './transportApi'

const COLUMNS = [
  { key: 'fullName',       label: 'Full Name',       required: true },
  { key: 'licenseNumber',  label: 'License Number',  required: true },
  { key: 'phone',          label: 'Phone',           required: false, hint: 'e.g. +263771000001' },
]

export function DriverImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const onSubmitRow = async (row: Record<string, string>) => {
    await createDriver({
      fullName: row.fullName.trim(),
      licenseNumber: row.licenseNumber.trim(),
      phone: row.phone?.trim() || null,
      userId: null,
    })
  }

  return (
    <BulkUploadModal
      title="Import Drivers"
      columns={COLUMNS}
      templateFileName="indlela-drivers-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => qc.invalidateQueries({ queryKey: ['drivers'] })}
      rowLabel={row => `${row.fullName} (${row.licenseNumber})`}
    />
  )
}
