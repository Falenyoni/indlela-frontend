import { useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import {
  createVehicleType, createVehicleMake, createVehicleModel,
  getVehicleMakes,
} from './transportApi'

const COLUMNS = [
  { key: 'entity',   label: 'Entity',    required: true,  hint: 'Type, Make, or Model' },
  { key: 'name',     label: 'Name',      required: true },
  { key: 'makeName', label: 'Make Name', required: false, hint: 'Required for Model rows only' },
]

export function FleetSetupImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data: makes = [] } = useQuery({ queryKey: ['vehicle-makes'], queryFn: () => getVehicleMakes() })

  // Accumulates makes created during this import so model rows can find them
  const makeMap = useRef<Record<string, string>>({})

  useEffect(() => {
    makes.forEach(m => { makeMap.current[m.name.toLowerCase()] = m.id })
  }, [makes])

  const onSubmitRow = async (row: Record<string, string>) => {
    const entity = row.entity.trim()
    const name = row.name.trim()

    if (entity === 'Type') {
      await createVehicleType(name)

    } else if (entity === 'Make') {
      const id = await createVehicleMake(name)
      makeMap.current[name.toLowerCase()] = id

    } else if (entity === 'Model') {
      const makeName = row.makeName?.trim()
      if (!makeName) throw new Error(`makeName is required for Model rows`)
      const makeId = makeMap.current[makeName.toLowerCase()]
      if (!makeId) throw new Error(`Make "${makeName}" not found — import it before its models`)
      await createVehicleModel(makeId, name)

    } else {
      throw new Error(`Unknown entity "${entity}" — must be Type, Make, or Model`)
    }
  }

  return (
    <BulkUploadModal
      title="Import Fleet Setup"
      columns={COLUMNS}
      templateFileName="indlela-fleet-setup-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => {
        qc.invalidateQueries({ queryKey: ['vehicle-types'] })
        qc.invalidateQueries({ queryKey: ['vehicle-makes'] })
        qc.invalidateQueries({ queryKey: ['vehicle-models'] })
      }}
      rowLabel={row => `${row.entity}: ${row.name}${row.makeName ? ` (${row.makeName})` : ''}`}
    />
  )
}
