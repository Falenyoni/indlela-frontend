const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginApiResponse {
  userId: string
  fullName: string
  email: string
  roles: string[]
  permissions: string[]
  organizationId: string
  organizationName: string
  primaryColor?: string | null
  logoBase64?: string | null
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export async function login(request: LoginRequest): Promise<LoginApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Invalid email or password')
  }

  return response.json()
}

export interface RefreshRequest {
  userId: string
  token: string
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export async function refresh(request: RefreshRequest): Promise<RefreshResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Session expired')
  }

  return response.json()
}
