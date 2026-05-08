'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

function UnreadBadge({ href, role }: { href: string; role: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Only show for pages where chat matters
    const chatPages: Record<string, string[]> = {
      '/decide': ['ADMIN'],
      '/pricing': ['BUYER', 'LEADER_PM'],
    }
    const rolesForPage = chatPages[href]
    if (!rolesForPage?.includes(role)) return

    async function check() {
      try {
        const res = await fetch('/api/notifications/unread')
        if (res.ok) {
          const data = await res.json()
          setCount(data.count || 0)
        }
      } catch {}
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [href, role])

  if (count === 0) return null
  return (
    <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
      style={{ backgroundColor: '#EF4444', color: 'white', fontSize: '10px' }}>
      {count > 9 ? '9+' : count}
    </span>
  )
}

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
  onClose?: () => void
}

const navItems: Record<string, { label: string; href: string; icon: string }[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Import Kalodata', href: '/import', icon: '📥' },
    { label: 'Duyệt hàng', href: '/review', icon: '✅' },
    { label: 'Chốt nhập', href: '/decide', icon: '🏁' },
    { label: 'Đã nhập', href: '/imports', icon: '📦' },
  ],
  LEADER_PM: [
    { label: 'Dashboard',          href: '/dashboard', icon: '📊' },
    { label: 'Thiết lập check giá', href: '/setup',    icon: '⚙️' },
    { label: 'Check giá',           href: '/pricing',  icon: '💰' },
  ],
  BUYER: [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Check giá', href: '/pricing', icon: '💰' },
    { label: 'Tạo mã Kiot', href: '/kiot', icon: '🏷️' },
  ],
}

const roleLabels: Record<string, string> = {
  ADMIN: 'PGĐ KD',
  LEADER_PM: 'Leader PM',
  BUYER: 'NVMH',
}

export default function Sidebar({ user, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const role = user.role || 'BUYER'
  const items = navItems[role] || navItems.BUYER

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <aside
      className="flex flex-col h-screen sticky top-0"
      style={{ width: 220, minWidth: 220, backgroundColor: '#111827' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-700">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-base shrink-0"
          style={{ backgroundColor: '#E05B28' }}
        >
          A
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold text-sm leading-tight">AKANO</div>
          <div className="text-gray-400 text-xs">Hàng Mới</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded"
            aria-label="Đóng menu"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? '#E05B28' : 'transparent',
                color: isActive ? '#ffffff' : '#9CA3AF',
              }}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <UnreadBadge href={item.href} role={role} />
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: '#E05B28' }}
          >
            {(user.name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user.name}</div>
            <span
              className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: '#1F2937', color: '#E05B28' }}
            >
              {roleLabels[role] || role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <span>🚪</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}
