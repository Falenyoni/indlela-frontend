import { useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import { createLocation, LOCATION_TYPES } from './locationsApi'

const COLUMNS = [
  { key: 'name',   label: 'Name',   required: true },
  { key: 'type',   label: 'Type',   required: true,  hint: `Airport, Hotel, Lodge, Camp, Harbour, Border, CityCenter, Other` },
  { key: 'region', label: 'Region', required: false, hint: 'e.g. Matabeleland North' },
  { key: 'notes',  label: 'Notes',  required: false },
]

const VALID_TYPES = new Set<string>(LOCATION_TYPES)

export function LocationImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const onSubmitRow = async (row: Record<string, string>) => {
    const type = row.type.trim()
    if (!VALID_TYPES.has(type))
      throw new Error(`Invalid type "${type}". Valid: ${LOCATION_TYPES.join(', ')}`)

    await createLocation({
      name: row.name.trim(),
      type,
      region: row.region?.trim() || null,
      notes: row.notes?.trim() || null,
    })
  }

  return (
    <BulkUploadModal
      title="Import Locations"
      columns={COLUMNS}
      templateFileName="indlela-locations-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => qc.invalidateQueries({ queryKey: ['locations'] })}
      rowLabel={row => `${row.name} (${row.type})`}
    />
  )
}
