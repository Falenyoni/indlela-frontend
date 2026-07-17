import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDocuments, uploadDocument, deleteDocument, downloadDocumentUrl, type DocumentDto } from './documentsApi'
import { getStoredAuth } from '@/shared/lib/auth/AuthContext'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(contentType: string): string {
  if (contentType.includes('pdf')) return '📄'
  if (contentType.includes('image')) return '🖼️'
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊'
  if (contentType.includes('word')) return '📝'
  return '📎'
}

export function DocumentsPanel({ bookingId }: { bookingId: string }) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', bookingId],
    queryFn: () => getDocuments(bookingId),
  })

  const remove = useMutation({
    mutationFn: (docId: string) => deleteDocument(bookingId, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', bookingId] }),
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      await uploadDocument(bookingId, file)
      await qc.invalidateQueries({ queryKey: ['documents', bookingId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDownload = (doc: DocumentDto) => {
    const stored = getStoredAuth()
    const url = downloadDocumentUrl(bookingId, doc.id)
    // Open download in a new tab — browser handles auth via the JWT in the link
    // For better auth, we fetch with the token and create an object URL
    fetch(url, {
      headers: stored?.accessToken ? { Authorization: `Bearer ${stored.accessToken}` } : {},
    })
      .then(r => r.blob())
      .then(blob => {
        const a = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(blob),
          download: doc.fileName,
        })
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Documents</h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '+ Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {isLoading && <p className="text-xs text-gray-400">Loading…</p>}

      {!isLoading && docs.length === 0 && (
        <p className="text-xs text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          No documents attached yet.
        </p>
      )}

      <div className="space-y-2">
        {docs.map(doc => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg"
          >
            <span className="text-xl leading-none">{fileIcon(doc.contentType)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.fileName}</p>
              <p className="text-xs text-gray-400">
                {formatBytes(doc.fileSizeBytes)} · {doc.uploadedByName} · {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleDownload(doc)}
                className="text-xs text-blue-600 hover:underline"
              >
                Download
              </button>
              <button
                onClick={() => remove.mutate(doc.id)}
                disabled={remove.isPending}
                className="text-xs text-red-500 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
