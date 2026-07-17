import { useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import { createActivity } from './activitiesApi'

const COLUMNS = [
  { key: 'name',                label: 'Name',                  required: true },
  { key: 'category',            label: 'Category',              required: true, hint: 'Safari / Game Drive / Cultural / Adventure / Wellness / Transfer / Other' },
  { key: 'pricePerPerson',      label: 'Price Per Person',      required: true, hint: 'Adult rate in base currency' },
  { key: 'childPricePerPerson', label: 'Child Price Per Person',hint: 'Optional — leave blank if same as adult' },
  { key: 'durationMinutes',     label: 'Duration (minutes)',    required: true, hint: 'e.g. 120' },
  { key: 'maxParticipants',     label: 'Max Participants',      hint: 'Optional — leave blank for unlimited' },
  { key: 'description',         label: 'Description',           hint: 'Optional' },
]

export function ActivityImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const onSubmitRow = async (row: Record<string, string>) => {
    await createActivity({
      name:                row.name,
      category:            row.category,
      pricePerPerson:      parseFloat(row.pricePerPerson),
      childPricePerPerson: row.childPricePerPerson ? parseFloat(row.childPricePerPerson) : null,
      durationMinutes:     Math.max(1, parseInt(row.durationMinutes, 10) || 60),
      maxParticipants:     row.maxParticipants ? parseInt(row.maxParticipants, 10) : null,
      description:         row.description || null,
    })
  }

  return (
    <BulkUploadModal
      title="Import Activities"
      columns={COLUMNS}
      templateFileName="indlela-activities-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => qc.invalidateQueries({ queryKey: ['activities'] })}
      rowLabel={(row) => row.name}
    />
  )
}
