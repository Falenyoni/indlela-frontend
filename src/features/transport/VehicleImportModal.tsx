import { useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import { createVehicle } from './transportApi'

const COLUMNS = [
  { key: 'registration', label: 'Registration',  required: true, hint: 'e.g. ZW 001 AAA' },
  { key: 'make',         label: 'Make',          required: true },
  { key: 'model',        label: 'Model',         required: true },
  { key: 'vehicleType',  label: 'Vehicle Type',  required: true, hint: 'Must match a type in Fleet Setup' },
  { key: 'capacity',     label: 'Capacity',      required: true, hint: 'Number of passengers' },
]

export function VehicleImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const onSubmitRow = async (row: Record<string, string>) => {
    const capacity = parseInt(row.capacity, 10)
    if (!capacity || capacity < 1) throw new Error(`Invalid capacity "${row.capacity}" — must be a number ≥ 1`)
    await createVehicle({
      registration: row.registration.trim().toUpperCase(),
      make: row.make.trim(),
      model: row.model.trim(),
      vehicleType: row.vehicleType.trim(),
      capacity,
    })
  }

  return (
    <BulkUploadModal
      title="Import Vehicles"
      columns={COLUMNS}
      templateFileName="indlela-vehicles-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => qc.invalidateQueries({ queryKey: ['vehicles'] })}
      rowLabel={row => `${row.registration} (${row.make} ${row.model})`}
    />
  )
}
