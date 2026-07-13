import { Navigate } from 'react-router'
import { useAuth } from './AuthContext'

interface Props {
  anyPermission: string[]
  children: React.ReactNode
}

export function PermissionGuard({ anyPermission, children }: Props) {
  const { hasPermission } = useAuth()
  const allowed = anyPermission.some(p => hasPermission(p))
  if (!allowed) return <Navigate to="/" replace />
  return <>{children}</>
}
