'use client'

import { useEffect, useState } from 'react'
import ProductStatusBadge from '@/components/ui/ProductStatusBadge'

function BuyerDashboard({ stats }: { stats: any }) {
  const [openSection, setOpenSection] = useState<string | null>(null)

  function fmt(n: number) {
    return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
  }

  const sections = [
    {
      key: 'need',
      label: 'Cần báo giá',
      value: stats.need_pricing || 0,
      icon: '📋',
      bg: '#DBEAFE', color: '#2563EB',
      list: stats.needPricingList || [],
      emptyMsg: 'Không có sản phẩm cần báo giá',
      actionLabel: 'Đi check giá →',
      actionHref: '/pricing',
    },
    {
      key: 'priced',
      label: 'Đã báo giá',
      value: stats.priced || 0,
      icon: '💰',
      bg: '#FEF3C7', color: '#D97706',
      list: stats.pricedList || [],
      emptyMsg: 'Chưa báo giá sản phẩm nào',
      actionLabel: undefined as string | undefined,
      actionHref: undefined as string | undefined,
    },
    {
      key: 'decided',
      label: 'Đã chốt',
      value: stats.decided || 0,
      icon: '✅',
      bg: '#DCFCE7', color: '#16A34A',
      list: stats.decidedList || [],
      emptyMsg: 'Chưa có sản phẩm nào được chốt',
      actionLabel: undefined as string | undefined,
      actionHref: undefined as string | undefined,
    },
  ]

  const statusLabel: Record<string, string> = {
    pricing: '🔵 Cần báo giá', pending_final: '⏳ Chờ chốt',
    done: '✅ Đã nhập', rejected: '❌ Từ chối',
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {sections.map(sec => (
          <button
            key={sec.key}
            onClick={() => setOpenSection(openSection === sec.key ? null : sec.key)}
            className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex items-center gap-4 text-left hover:shadow-md transition-shadow w-full"
            style={{ borderColor: openSection === sec.key ? sec.color : '#E5E7EB' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: sec.bg }}>
              {sec.icon}
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-[#111827]">{sec.value}</div>
              <div className="text-sm text-[#6B7280]">{sec.label}</div>
            </div>
            <span className="text-[#6B7280]">{openSection === sec.key ? '▲' : '▼'}</span>
          </button>
        ))}
      </div>

      {sections.map(sec => openSection === sec.key && (
        <div key={sec.key} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between" style={{ backgroundColor: sec.bg }}>
            <h3 className="font-semibold text-sm" style={{ color: sec.color }}>{sec.icon} {sec.label} ({sec.value})</h3>
            {sec.actionHref && (
              <a href={sec.actionHref} className="text-xs font-semibold underline" style={{ color: sec.color }}>{sec.actionLabel}</a>
            )}
          </div>
          {sec.list.length === 0 ? (
            <div className="p-8 text-center text-[#6B7280] text-sm">{sec.emptyMsg}</div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {sec.list.map((p: any) => (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0" style={{ background: '#FFF3EE', color: '#E05B28' }}>
                    {p.checkCode || '—'}
                  </span>
                  <span className="flex-1 text-sm font-medium text-[#111827] truncate">{p.name}</span>
                  {p.totalPerUnit && (
                    <span className="text-xs font-semibold shrink-0" style={{ color: '#E05B28' }}>{fmt(p.totalPerUnit)}/chiếc</span>
                  )}
                  <span className="text-xs text-[#6B7280] shrink-0">{statusLabel[p.status] || p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function AdminDashboard({ stats }: { stats: any }) {
  const [openSection, setOpenSection] = useState<string | null>(null)

  function fmt(n: number) {
    return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
  }

  const sections = [
    { key: 'pending_review', label: 'Chờ duyệt', icon: '👁️', bg: '#DBEAFE', color: '#2563EB', value: stats.pending_review || 0, list: stats.pendingReviewList || [], href: '/review' },
    { key: 'pricing', label: 'Đang check giá', icon: '💰', bg: '#FFF3EE', color: '#E05B28', value: stats.pricing || 0, list: stats.pricingList || [], href: '/review' },
    { key: 'pending_final', label: 'Chờ chốt', icon: '⏳', bg: '#FEF3C7', color: '#D97706', value: stats.pending_final || 0, list: stats.pendingFinalList || [], href: '/decide' },
    { key: 'done', label: 'Đã nhập', icon: '✅', bg: '#DCFCE7', color: '#16A34A', value: stats.done || 0, list: stats.doneList || [], href: null },
    { key: 'pending_setup', label: 'Chờ thiết lập', icon: '⚙️', bg: '#EDE9FE', color: '#7C3AED', value: stats.pending_setup || 0, list: stats.pendingSetupList || [], href: '/review' },
    { key: 'rejected', label: 'Từ chối', icon: '❌', bg: '#FEE2E2', color: '#DC2626', value: stats.rejected || 0, list: stats.rejectedList || [], href: null },
  ]

  const statusLabel: Record<string, string> = {
    pending_review: '👁️ Chờ duyệt', pending_setup: '⚙️ Chờ thiết lập',
    pricing: '💰 Check giá', pending_final: '⏳ Chờ chốt',
    done: '✅ Đã nhập', rejected: '❌ Từ chối',
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
        {sections.slice(0, 6).map(sec => (
          <button key={sec.key}
            onClick={() => setOpenSection(openSection === sec.key ? null : sec.key)}
            className="bg-white rounded-xl border p-4 flex items-center gap-3 text-left hover:shadow-md transition-shadow w-full"
            style={{ borderColor: openSection === sec.key ? sec.color : '#E5E7EB' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: sec.bg }}>
              {sec.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold text-[#111827]">{sec.value}</div>
              <div className="text-xs text-[#6B7280] truncate">{sec.label}</div>
            </div>
            <span className="text-[#6B7280] text-xs">{openSection === sec.key ? '▲' : '▼'}</span>
          </button>
        ))}
      </div>

      {sections.map(sec => openSection === sec.key && (
        <div key={sec.key} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between" style={{ backgroundColor: sec.bg }}>
            <h3 className="font-semibold text-sm" style={{ color: sec.color }}>{sec.icon} {sec.label} ({sec.value})</h3>
            {sec.href && (
              <a href={sec.href} className="text-xs font-semibold underline" style={{ color: sec.color }}>Xem trang →</a>
            )}
          </div>
          {sec.list.length === 0 ? (
            <div className="p-8 text-center text-[#6B7280] text-sm">Không có sản phẩm</div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {sec.list.map((p: any) => (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0" style={{ background: '#FFF3EE', color: '#E05B28' }}>
                    {p.checkCode || '—'}
                  </span>
                  <span className="flex-1 text-sm text-[#111827] truncate">{p.name}</span>
                  {p.totalPerUnit && <span className="text-xs font-semibold shrink-0" style={{ color: '#E05B28' }}>{fmt(p.totalPerUnit)}/chiếc</span>}
                  <span className="text-xs text-[#6B7280] shrink-0">{statusLabel[p.status] || p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {stats.recent && stats.recent.length > 0 && !openSection && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold text-[#111827] mb-4">Hoạt động gần đây</h2>
          <div className="space-y-3">
            {stats.recent.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0">
                <div>
                  <div className="text-sm font-medium text-[#111827]">{p.name}</div>
                  <div className="text-xs text-[#6B7280]">
                    {p.checkCode && <span className="mr-2 font-mono">{p.checkCode}</span>}
                    {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <ProductStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, bg, color }: { label: string; value: number; icon: string; bg: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: bg }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-[#111827]">{value}</div>
        <div className="text-sm text-[#6B7280]">{label}</div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-6 bg-gray-200 rounded w-16" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
    </div>
  )
}

export default function DashboardContent() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#111827] mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  if (!stats) return <div className="text-[#6B7280]">Không thể tải dữ liệu</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#111827] mb-2">Dashboard</h1>
      <p className="text-[#6B7280] mb-6">Tổng quan hệ thống AKANO Hàng Mới</p>

      {stats.role === 'ADMIN' && <AdminDashboard stats={stats} />}

      {stats.role === 'LEADER_PM' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Chờ thiết lập" value={stats.pending_setup || 0} icon="⚙️" bg="#EDE9FE" color="#7C3AED" />
          <StatCard label="Đang check giá" value={stats.pricing || 0} icon="💰" bg="#FFF3EE" color="#E05B28" />
        </div>
      )}

      {stats.role === 'BUYER' && (
        <BuyerDashboard stats={stats} />
      )}
    </div>
  )
}
