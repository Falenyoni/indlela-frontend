import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/app/router'
import { queryClient } from '@/app/queryClient'
import { AuthProvider } from '@/shared/lib/auth/AuthContext'
import { ThemeProvider } from '@/shared/lib/theme/ThemeContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
