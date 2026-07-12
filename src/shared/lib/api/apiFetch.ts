import { getStoredAuth, setStoredTokens, clearStoredAuth } from '@/shared/lib/auth/AuthContext'
import { refresh } from '@/features/auth/authApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  // If a refresh is already in flight, reuse it instead of firing a second one.
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

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const stored = getStoredAuth()

  const doFetch = (token: string | undefined) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

  let response = await doFetch(stored?.accessToken)

  if (response.status === 401 && stored) {
    try {
      const newAccessToken = await refreshAccessToken()
      response = await doFetch(newAccessToken)
    } catch {
      clearStoredAuth()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  return response
}
