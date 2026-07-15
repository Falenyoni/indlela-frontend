import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDiscountRequests, reviewDiscountRequest, type DiscountRequestRow } from './discountRequestsApi'
import { useAuth } from '@/shared/lib/auth/AuthContext'
import { Permissions } from '@/shared/lib/auth/permissions'

const STATUS_COLORS: Record<string, string> = {
  Pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

type ReviewState = { id: string; decision: 'approve' | 'reject' } | null

export function DiscountRequestsPage() {
  const { hasPermission } = useAuth()
  const canApprove = hasPermission(Permissions.Discounts.Approve)
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('Pending')
  const [reviewing, setReviewing] = useState<ReviewState>(null)
  const [note, setNote] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['discount-requests', statusFilter],
    queryFn: () => getDiscountRequests(statusFilter || undefined),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['discount-requests'] })

  const review = useMutation({
    mutationFn: () => reviewDiscountRequest(reviewing!.id, reviewing!.decision === 'approve', note || undefined),
    onSuccess: () => { invalidate(); setReviewing(null); setNote('') },
  })

  const openReview = (id: string, decision: 'approve' | 'reject') => {
    setReviewing({ id, decision })
    setNote('')
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })

  const pending = requests.filter(r => r.status === 'Pending')
  const others  = requests.filter(r => r.status !== 'Pending')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Discount Requests</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {canApprove ? 'Review and approve or reject discount requests from consultants' : 'Track the status of your discount requests'}
        </p>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Pending badge */}
      {statusFilter !== 'Pending' && canApprove && pending.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-2.5">
          <span className="font-medium">{pending.length} pending approval</span>
          <button onClick={() => setStatusFilter('Pending')} className="text-xs underline">View</button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>{['Booking', 'Requested By', 'Discount %', 'Reason', 'Submitted', 'Status', 'Reviewed By', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>}
            {!isLoading && requests.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                {statusFilter === 'Pending' ? 'No pending requests' : 'No requests found'}
              </td></tr>
            )}
            {[...pending, ...others].map((r: DiscountRequestRow) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.reservationNumber}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.requestedByName}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{r.requestedDiscountPercent}%</span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[220px] truncate" title={r.reason}>{r.reason}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {r.reviewedByName
                    ? <span>{r.reviewedByName}{r.reviewedAt && <> · {fmtDate(r.reviewedAt)}</>}</span>
                    : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  {r.reviewNote && (
                    <div className="text-gray-400 italic truncate max-w-[160px]" title={r.reviewNote}>"{r.reviewNote}"</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.status === 'Pending' && canApprove && (
                    <div className="flex gap-2">
                      <button onClick={() => openReview(r.id, 'approve')}
                        className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800">
                        Approve
                      </button>
                      <button onClick={() => openReview(r.id, 'reject')}
                        className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800">
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {reviewing.decision === 'approve' ? 'Approve Request' : 'Reject Request'}
            </h3>
            <p className="text-sm text-gray-500">
              {reviewing.decision === 'approve'
                ? 'Add an optional note for the consultant.'
                : 'Please provide a reason for rejecting this request.'}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Note {reviewing.decision === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                placeholder={reviewing.decision === 'approve' ? 'Optional note…' : 'Reason for rejection…'}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {review.isError && <p className="text-sm text-red-500">{String(review.error)}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => review.mutate()}
                disabled={review.isPending || (reviewing.decision === 'reject' && !note.trim())}
                className={`flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${
                  reviewing.decision === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}>
                {review.isPending ? 'Saving…' : reviewing.decision === 'approve' ? 'Approve' : 'Reject'}
              </button>
              <button onClick={() => { setReviewing(null); setNote('') }}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
