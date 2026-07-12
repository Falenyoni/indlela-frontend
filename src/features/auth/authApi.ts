const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  userId: string
  fullName: string
  email: string
  role: string
  organizationId: string
  organizationName: string
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
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
