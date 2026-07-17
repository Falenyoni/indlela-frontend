import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BulkUploadModal } from '@/shared/components/BulkUploadModal'
import { apiFetch } from '@/shared/lib/api/apiFetch'
import { getGuests } from '../guests/guestsApi'
import { getUsers } from '../settings/settingsApi'

// Reservations import resolves Guest by document number and Consultant by user email.
// /api/consultants only returns { id, fullName } — no email — so we use /api/users instead.

const COLUMNS = [
  { key: 'guestDocument',  label: 'Guest Document No',  required: true, hint: 'Passport/ID number of existing guest' },
  { key: 'guestName',      label: 'Guest Name',         required: true, hint: 'For display — e.g. John Smith' },
  { key: 'consultantEmail',label: 'Consultant Email',   required: true, hint: 'Email of the consultant user account' },
  { key: 'travelStartDate',label: 'Travel Start Date',  required: true, hint: 'YYYY-MM-DD' },
  { key: 'travelEndDate',  label: 'Travel End Date',    required: true, hint: 'YYYY-MM-DD' },
  { key: 'adultPax',       label: 'Adult Pax',          required: true, hint: 'e.g. 2' },
  { key: 'childPax',       label: 'Child Pax',          hint: 'Default 0' },
  { key: 'bookingSource',  label: 'Booking Source',     required: true, hint: 'Direct / Agent / Online / Referral / WalkIn / Other' },
  { key: 'paymentHandling',label: 'Payment Handling',   hint: 'ThroughDMC / GuestPaysDirect / ThroughAgent (default: ThroughDMC)' },
  { key: 'agentName',      label: 'Agent Name',         hint: 'Optional — name of travel agent' },
  { key: 'notes',          label: 'Notes',              hint: 'Optional' },
]

export function ReservationImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const { data: guests = [], isLoading: loadingGuests } = useQuery({
    queryKey: ['guests-all'],
    queryFn: () => getGuests(),
  })

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users-import'],
    queryFn: () => getUsers(),
  })

  const guestByDoc = useMemo(() =>
    Object.fromEntries(
      guests
        .filter(g => g.documentNumber)
        .map(g => [g.documentNumber.toLowerCase(), g])
    ),
    [guests])

  const consultantByEmail = useMemo(() =>
    Object.fromEntries(
      users
        .filter(u => u.email)
        .map(u => [u.email.toLowerCase(), { id: u.id, fullName: u.fullName, email: u.email }])
    ),
    [users])

  const onSubmitRow = async (row: Record<string, string>) => {
    const guest = guestByDoc[row.guestDocument?.toLowerCase()]
    if (!guest) throw new Error(`No guest found with document "${row.guestDocument}"`)

    const consultant = consultantByEmail[row.consultantEmail?.toLowerCase()]
    if (!consultant) throw new Error(`No consultant with email "${row.consultantEmail}"`)

    const res = await apiFetch('/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        guestId:         guest.id,
        guestName:       row.guestName || guest.fullName,
        consultantId:    consultant.id,
        consultantName:  consultant.fullName,
        travelStartDate: row.travelStartDate,
        travelEndDate:   row.travelEndDate,
        adultPax:        parseInt(row.adultPax, 10) || 1,
        childPax:        parseInt(row.childPax, 10) || 0,
        bookingSource:   row.bookingSource || 'Direct',
        paymentHandling: row.paymentHandling || 'ThroughDMC',
        agentName:       row.agentName || null,
        notes:           row.notes || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.detail ?? err?.message ?? 'Failed to create reservation')
    }
  }

  const ready = !loadingGuests && !loadingUsers

  return (
    <BulkUploadModal
      title={ready ? 'Import Reservations' : 'Loading lookups…'}
      columns={COLUMNS}
      templateFileName="indlela-reservations-template.csv"
      onClose={onClose}
      onSubmitRow={onSubmitRow}
      onDone={() => qc.invalidateQueries({ queryKey: ['reservations'] })}
      rowLabel={(row) => `${row.guestName} · ${row.travelStartDate}`}
    />
  )
}
