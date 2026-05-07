'use client'

import { useEffect, useState } from 'react'
import ProductStatusBadge from '@/components/ui/ProductStatusBadge'

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

      {stats.role === 'ADMIN' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Chờ duyệt" value={stats.pendingReview} icon="👁️" bg="#DBEAFE" color="#2563EB" />
            <StatCard label="Đang check giá" value={stats.pricing} icon="💰" bg="#FFF3EE" color="#E05B28" />
            <StatCard label="Chờ chốt" value={stats.pendingFinal} icon="⏳" bg="#FEF3C7" color="#D97706" />
            <StatCard label="Đã nhập" value={stats.done} icon="✅" bg="#DCFCE7" color="#16A34A" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Tổng sản phẩm" value={stats.total} icon="📦" bg="#F3F4F6" color="#6B7280" />
            <StatCard label="Chờ thiết lập" value={stats.pendingSetup} icon="⚙️" bg="#EDE9FE" color="#7C3AED" />
            <StatCard label="Từ chối" value={stats.rejected} icon="❌" bg="#FEE2E2" color="#DC2626" />
          </div>
          {stats.recent && stats.recent.length > 0 && (
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
        </>
      )}

      {stats.role === 'LEADER_PM' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Chờ thiết lập" value={stats.pendingSetup} icon="⚙️" bg="#EDE9FE" color="#7C3AED" />
          <StatCard label="Phân công hôm nay" value={stats.assignedToday} icon="👤" bg="#DBEAFE" color="#2563EB" />
        </div>
      )}

      {stats.role === 'BUYER' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Được phân công" value={stats.assigned} icon="📋" bg="#DBEAFE" color="#2563EB" />
          <StatCard label="Đã báo giá" value={stats.pricingDone} icon="💰" bg="#FEF3C7" color="#D97706" />
          <StatCard label="Đã nhập" value={stats.done} icon="✅" bg="#DCFCE7" color="#16A34A" />
        </div>
      )}
    </div>
  )
}
