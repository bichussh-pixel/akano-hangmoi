'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'

interface MobileWrapperProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
  children: React.ReactNode
}

export default function MobileWrapper({ user, children }: MobileWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F4F6]">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: overlay on mobile, static on desktop */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
          'md:relative md:flex md:shrink-0 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 shrink-0" style={{ backgroundColor: '#111827' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white p-1 rounded"
            aria-label="Mở menu"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
              style={{ backgroundColor: '#E05B28' }}
            >
              A
            </div>
            <span className="text-white font-semibold text-sm">AKANO</span>
            <span className="text-gray-400 text-xs">Hàng Mới</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
