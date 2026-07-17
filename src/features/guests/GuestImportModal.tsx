import { useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import { registerGuest } from './guestsApi'

const COLUMNS = [
  { key: 'firstName',     label: 'First Name',     required: true },
  { key: 'lastName',      label: 'Last Name',      required: true },
  { key: 'middleName',    label: 'Middle Name',     hint: 'Optional' },
  { key: 'dateOfBirth',   label: 'Date of Birth',  required: true, hint: 'YYYY-MM-DD' },
  { key: 'gender',        label: 'Gender',         required: true, hint: 'Male / Female / Other' },
  { key: 'documentType',  label: 'Document Type',  required: true, hint: 'Passport / NationalId' },
  { key: 'documentNumber',label: 'Document Number',required: true },
  { key: 'nationality',   label: 'Nationality',    hint: 'e.g. Zimbabwean' },
  { key: 'phone',         label: 'Phone',          required: true, hint: 'e.g. +263771234567' },
  { key: 'email',         label: 'Email',          hint: 'Optional' },
]

const GENDER_MAP: Record<string, string> = {
  m: 'Male', male: 'Male',
  f: 'Female', female: 'Female',
  other: 'Other',
}

const DOC_MAP: Record<string, string> = {
  passport: 'Passport',
  nationalid: 'NationalId', 'national id': 'NationalId', 'national_id': 'NationalId',
}

export function GuestImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const onSubmitRow = async (row: Record<string, string>) => {
    const gender = GENDER_MAP[row.gender.toLowerCase()] ?? row.gender
    const docType = DOC_MAP[row.documentType.toLowerCase()] ?? row.documentType

    // xlsx strips leading '+' from phone numbers — restore it
    const phone = row.phone.startsWith('+') ? row.phone : `+${row.phone}`

    await registerGuest({
      firstName:      row.firstName,
      lastName:       row.lastName,
      middleName:     row.middleName || null,
      dateOfBirth:    row.dateOfBirth,
      gender,
      documentType:   docType,
      documentNumber: row.documentNumber,
      nationality:    row.nationality || null,
      contacts: [{ type: 'Phone', phoneNumber: phone, email: row.email || null, isPrimary: true }],
      addresses: null,
    })
  }

  return (
    <BulkUploadModal
      title="Import Guests"
      columns={COLUMNS}
      templateFileName="indlela-guests-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => qc.invalidateQueries({ queryKey: ['guests'] })}
      rowLabel={(row) => `${row.firstName} ${row.lastName}`}
    />
  )
}
