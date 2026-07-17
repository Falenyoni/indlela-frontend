import { getStoredAuth, setStoredTokens, clearStoredAuth } from '@/shared/lib/auth/AuthContext'
import { refresh } from '@/features/auth/authApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const stored = getStoredAuth()
    if (!stored) throw new Error('No stored session to refresh')
    const result = await refresh({ userId: stored.user.userId, token: stored.refreshToken })
    setStoredTokens(result.accessToken, result.refreshToken, result.expiresAt)
    return result.accessToken
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

// Use this instead of apiFetch when sending FormData (file uploads).
// It deliberately omits Content-Type so the browser can set it with the multipart boundary.
export async function apiUpload(path: string, formData: FormData): Promise<Response> {
  const stored = getStoredAuth()

  const doFetch = (token: string | undefined) =>
    fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

  let response = await doFetch(stored?.accessToken)

  if (response.status === 401 && stored) {
    try {
      const newToken = await refreshAccessToken()
      response = await doFetch(newToken)
    } catch {
      clearStoredAuth()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  return response
}
