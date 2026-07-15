import { useState, useCallback } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from '@/app/layout/Sidebar'
import { Navbar } from '@/app/layout/Navbar'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
        <footer className="shrink-0 px-6 py-2 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-600">
          Indlela by <span className="font-medium text-gray-500 dark:text-gray-500">Kaithero</span>
        </footer>
      </div>
    </div>
  )
}

export default App
