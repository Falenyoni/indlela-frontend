import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import { logOdometerReading } from './fleetApi'
import { getVehicles } from '../transport/transportApi'

const COLUMNS = [
  { key: 'registration', label: 'Registration', required: true,  hint: 'Must match an existing vehicle' },
  { key: 'readingKm',    label: 'Reading (km)', required: true,  hint: 'Current odometer value' },
  { key: 'readingDate',  label: 'Date',         required: true,  hint: 'YYYY-MM-DD' },
  { key: 'notes',        label: 'Notes',        required: false },
]

export function MileageImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const qc = useQueryClient()
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-mileage-import'],
    queryFn: () => getVehicles(),
  })

  const vehicleByReg = useMemo(() =>
    Object.fromEntries(vehicles.map(v => [v.registration.toUpperCase(), v.id])),
    [vehicles])

  const onSubmitRow = async (row: Record<string, string>) => {
    const vehicleId = vehicleByReg[row.registration.trim().toUpperCase()]
    if (!vehicleId) throw new Error(`Vehicle "${row.registration}" not found — check the registration`)

    const readingKm = parseInt(row.readingKm, 10)
    if (!readingKm || readingKm < 1) throw new Error(`Invalid reading "${row.readingKm}" — must be a number ≥ 1`)

    await logOdometerReading(vehicleId, {
      readingKm,
      readingDate: row.readingDate.trim(),
      notes: row.notes?.trim() || null,
    })
  }

  return (
    <BulkUploadModal
      title="Import Mileage Readings"
      columns={COLUMNS}
      templateFileName="indlela-mileage-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => {
          qc.invalidateQueries({ queryKey: ['fleet-service-status'] })
          onSuccess?.()
        }}
      rowLabel={row => `${row.registration} — ${row.readingKm} km on ${row.readingDate}`}
    />
  )
}
