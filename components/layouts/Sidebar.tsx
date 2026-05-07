'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
}

const navItems: Record<string, { label: string; href: string; icon: string }[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Import Kalodata', href: '/import', icon: '📥' },
    { label: 'Duyệt hàng', href: '/review', icon: '✅' },
    { label: 'Chốt nhập', href: '/decide', icon: '🏁' },
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

export default function Sidebar({ user }: SidebarProps) {
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
        <div>
          <div className="text-white font-semibold text-sm leading-tight">AKANO</div>
          <div className="text-gray-400 text-xs">Hàng Mới</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? '#E05B28' : 'transparent',
                color: isActive ? '#ffffff' : '#9CA3AF',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
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
