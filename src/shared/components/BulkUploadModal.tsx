import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'

export interface ImportColumn {
  key: string
  label: string
  required?: boolean
  hint?: string
}

interface RowResult {
  row: number
  label: string
  status: 'pending' | 'ok' | 'error'
  error?: string
}

interface Props {
  title: string
  columns: ImportColumn[]
  templateFileName: string
  onClose: () => void
  onSubmitRow: (values: Record<string, string>) => Promise<void>
  onDone: () => void
  rowLabel?: string | ((values: Record<string, string>) => string)
}

type Phase = 'idle' | 'preview' | 'importing' | 'done'

async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: true })
}

function extractValue(row: Record<string, unknown>, col: ImportColumn): string {
  const lower = col.label.toLowerCase()
  for (const k of Object.keys(row)) {
    if (k.trim().toLowerCase() !== lower) continue
    const val = row[k]
    if (val instanceof Date) {
      const y = val.getFullYear()
      const m = String(val.getMonth() + 1).padStart(2, '0')
      const d = String(val.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    return String(val ?? '').trim()
  }
  return ''
}

function downloadTemplate(columns: ImportColumn[], filename: string) {
  const header = columns.map((c) => `"${c.label}"`).join(',')
  const hints  = columns.map((c) => `"${c.hint ?? ''}"`).join(',')
  const csv    = `${header}\n${hints}\n`
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

export function BulkUploadModal({ title, columns, templateFileName, onClose, onSubmitRow, onDone, rowLabel }: Props) {
  const [phase, setPhase]   = useState<Phase>('idle')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows]     = useState<Record<string, string>[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [results, setResults] = useState<RowResult[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setParseError(null)
    setFileName(file.name)
    try {
      const raw = await parseFile(file)
      const normalized = raw.map((rawRow) =>
        Object.fromEntries(columns.map((col) => [col.key, extractValue(rawRow, col)])),
      )
      const errors: string[] = []
      normalized.forEach((row, i) => {
        columns.filter((c) => c.required).forEach((col) => {
          if (!row[col.key]) errors.push(`Row ${i + 1}: "${col.label}" is required`)
        })
      })
      setRows(normalized)
      setValidationErrors(errors)
      setPhase('preview')
    } catch {
      setParseError('Failed to parse file. Make sure it is a valid CSV or Excel file.')
    }
  }, [columns])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  async function runImport() {
    setPhase('importing')
    const initial: RowResult[] = rows.map((row, i) => ({
      row: i + 1,
      label: typeof rowLabel === 'function' ? rowLabel(row) : rowLabel ? `${rowLabel} ${i + 1}` : `Row ${i + 1}`,
      status: 'pending',
    }))
    setResults(initial)
    const updated = [...initial]
    for (let i = 0; i < rows.length; i++) {
      try {
        await onSubmitRow(rows[i])
        updated[i] = { ...updated[i], status: 'ok' }
      } catch (err) {
        updated[i] = { ...updated[i], status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
      }
      setResults([...updated])
    }
    setPhase('done')
    onDone()
  }

  const done         = results.filter((r) => r.status !== 'pending').length
  const successCount = results.filter((r) => r.status === 'ok').length
  const errorCount   = results.filter((r) => r.status === 'error').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {phase !== 'importing' && (
            <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">×</button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* IDLE */}
          {phase === 'idle' && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Download template</p>
                  <p className="text-xs text-gray-500 mt-0.5">Fill it in, then upload below</p>
                </div>
                <button onClick={() => downloadTemplate(columns, templateFileName)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                  ↓ CSV template
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Expected columns
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {columns.map((col) => (
                    <div key={col.key} className="flex items-center justify-between px-4 py-2">
                      <span className="text-gray-700 dark:text-gray-300">
                        {col.label}{col.required && <span className="ml-1 text-red-500">*</span>}
                      </span>
                      {col.hint && <span className="text-xs text-gray-400">{col.hint}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                }`}
              >
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileInput} />
                <p className="text-3xl mb-2">📂</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop your file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">CSV · XLSX · XLS</p>
                {parseError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{parseError}</p>}
              </div>
            </>
          )}

          {/* PREVIEW */}
          {phase === 'preview' && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: 'var(--color-primary, #3b82f6)' }}>
                  {rows.length}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {rows.length} row{rows.length !== 1 ? 's' : ''} found in{' '}
                    <span className="text-blue-600 dark:text-blue-400">{fileName}</span>
                  </p>
                  <p className="text-xs text-gray-500">Preview of first 5 rows</p>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                    {validationErrors.length} validation issue{validationErrors.length !== 1 ? 's' : ''} — fix your file and re-upload
                  </p>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                    {validationErrors.slice(0, 8).map((e, i) => <li key={i}>· {e}</li>)}
                    {validationErrors.length > 8 && <li>· … and {validationErrors.length - 8} more</li>}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      {columns.map((c) => (
                        <th key={c.key} className="px-3 py-2 text-left font-medium whitespace-nowrap">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        {columns.map((c) => (
                          <td key={c.key} className={`px-3 py-2 ${c.required && !row[c.key] ? 'bg-red-50 dark:bg-red-950/20 text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                            {row[c.key] || <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={() => { setPhase('idle'); setRows([]); setValidationErrors([]); setParseError(null) }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                ← Upload a different file
              </button>
            </>
          )}

          {/* IMPORTING / DONE */}
          {(phase === 'importing' || phase === 'done') && (
            <>
              {phase === 'done' && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${errorCount === 0
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-700'}`}>
                  {successCount} imported successfully{errorCount > 0 && ` · ${errorCount} failed`}
                </div>
              )}

              {phase === 'importing' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Importing…</span><span>{done} / {rows.length}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${(done / rows.length) * 100}%`, background: 'var(--color-primary, #3b82f6)' }} />
                  </div>
                </div>
              )}

              <div className="overflow-y-auto max-h-72 rounded-xl border border-gray-100 dark:border-gray-800 p-2 space-y-0.5">
                {results.map((r) => (
                  <div key={r.row} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs ${r.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                    <span className="shrink-0 mt-0.5">{r.status === 'pending' ? '⏳' : r.status === 'ok' ? '✅' : '❌'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-700 dark:text-gray-300">{r.label}</span>
                      {r.error && <p className="text-red-500 mt-0.5">{r.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          {phase !== 'importing' && (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800">
              {phase === 'done' ? 'Close' : 'Cancel'}
            </button>
          )}
          {phase === 'preview' && (
            <button onClick={runImport} disabled={validationErrors.length > 0}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary, #3b82f6)' }}>
              Import {rows.length} row{rows.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
