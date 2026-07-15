import { useState } from 'react'

type BillingTab = 'invoices' | 'payments' | 'statements'
type DatePeriod = '' | 'today' | 'week' | 'month' | 'year' | 'custom'

const DATE_PERIODS: { value: DatePeriod; label: string }[] = [
  { value: '',       label: 'All time' },
  { value: 'today',  label: 'Today' },
  { value: 'week',   label: 'This week' },
  { value: 'month',  label: 'This month' },
  { value: 'year',   label: 'This year' },
  { value: 'custom', label: 'Custom…' },
]

const selectCls = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
const dateCls   = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'

const TABS: { id: BillingTab; label: string }[] = [
  { id: 'invoices',   label: 'Invoices' },
  { id: 'payments',   label: 'Payments' },
  { id: 'statements', label: 'Agent Statements' },
]

const INVOICE_COLS    = ['Invoice #', 'Booking Ref', 'Guest / Agent', 'Issued', 'Due', 'Amount', 'Status']
const PAYMENT_COLS    = ['Receipt #', 'Booking Ref', 'Guest', 'Method', 'Date', 'Amount', 'Collected by']
const STATEMENT_COLS  = ['Agent', 'Period', 'Bookings', 'Total Value', 'Commission', 'Net Payable', '']

function EmptyState({ label }: { label: string }) {
  return (
    <div className="px-4 py-16 text-center">
      <div className="text-3xl mb-3">🧾</div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        This section will populate once the Billing API is connected.
      </p>
    </div>
  )
}

export function BillingPage() {
  const [tab,        setTab]        = useState<BillingTab>('invoices')
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const cols = tab === 'invoices' ? INVOICE_COLS : tab === 'payments' ? PAYMENT_COLS : STATEMENT_COLS

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Invoices, payments and agent statements</p>
        </div>
        <button disabled
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium opacity-40 cursor-not-allowed">
          {tab === 'invoices' ? '+ New Invoice' : tab === 'payments' ? '+ Record Payment' : '+ Generate Statement'}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={datePeriod} onChange={e => setDatePeriod(e.target.value as DatePeriod)} className={selectCls}>
          {DATE_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {tab === 'invoices' && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Void">Void</option>
          </select>
        )}

        {tab === 'payments' && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="">All methods</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="EFT">EFT</option>
            <option value="AgentCredit">Agent Credit</option>
            <option value="BankTransfer">Bank Transfer</option>
          </select>
        )}

        {tab === 'statements' && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="">All agents</option>
          </select>
        )}

        {datePeriod === 'custom' && (<>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={dateCls} />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   className={dateCls} />
        </>)}
      </div>

      {/* Table shell */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>
              {cols.map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={cols.length}>
                <EmptyState label={
                  tab === 'invoices'   ? 'No invoices yet' :
                  tab === 'payments'   ? 'No payments recorded yet' :
                  'No agent statements generated yet'
                } />
              </td>
            </tr>
          </tbody>
        </table>
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 text-xs text-gray-400">
          0 records
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
        <strong>Coming soon:</strong> PDF invoice generation, emailing to guests/agents, agent commission statements, and accounting export (Xero / Sage).
      </div>
    </div>
  )
}
