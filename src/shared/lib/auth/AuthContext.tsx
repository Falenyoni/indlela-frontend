import { createContext, useContext, useState, type ReactNode } from 'react'

export interface User {
  userId: string
  fullName: string
  email: string
  roles: string[]
  permissions: string[]
  organizationId: string
  organizationName: string
}

export interface LoginResponse extends User {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface StoredAuth {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: string
}

const STORAGE_KEY = 'indlela_auth'

export function getStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setStoredTokens(accessToken: string, refreshToken: string, expiresAt: string) {
  const existing = getStoredAuth()
  if (!existing) return
  const updated = { ...existing, accessToken, refreshToken, expiresAt }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
  hasAnyRole: (...roles: string[]) => boolean
  login: (response: LoginResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredAuth()
  const [user, setUser] = useState<User | null>(stored?.user ?? null)

  function login(response: LoginResponse) {
    const { accessToken, refreshToken, expiresAt, ...userData } = response
    setUser(userData)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: userData, accessToken, refreshToken, expiresAt }),
    )
  }

  function logout() {
    setUser(null)
    clearStoredAuth()
  }

  function hasPermission(permission: string): boolean {
    return user?.permissions.includes(permission) ?? false
  }

  function hasAnyRole(...roles: string[]): boolean {
    return roles.some(r => user?.roles.includes(r) ?? false)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, hasPermission, hasAnyRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
