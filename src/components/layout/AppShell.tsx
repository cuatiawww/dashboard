'use client'

import { useCallback, useState } from 'react'
import DashboardHeader, { DashboardSidebar } from './DashboardHeader'
import Footer from './Footer'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <main className="min-h-screen">
      <DashboardSidebar open={sidebarOpen} onClose={closeSidebar} />
      <DashboardHeader onToggleSidebar={() => setSidebarOpen((open) => !open)} />
      {children}
      <Footer />
    </main>
  )
}
