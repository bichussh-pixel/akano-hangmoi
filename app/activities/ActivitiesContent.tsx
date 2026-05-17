'use client'

import { useEffect, useState } from 'react'

type ActivityType =
  | 'approved'
  | 'rejected'
  | 'priced'
  | 'price_updated'
  | 'setup'
  | 'decided_import'
  | 'decided_reject'
  | 'cancelled'

interface Activity {
  id?: string
  type: ActivityType
  productId: string
  productName: string
  checkCode?: string
  userId: string
  userName: string
  timestamp: number
  meta?: Record<string, unknown>
}

function fmt(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d} ngày trước`
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateGroup(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return 'Hôm nay'
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

const TYPE_CONFIG: Record<ActivityType, { icon: string; label: string; bg: string; color: string }> = {
  approved:        { icon: '✅', label: 'Duyệt hàng',     bg: '#DCFCE7', color: '#16A34A' },
  rejected:        { icon: '❌', label: 'Từ chối',         bg: '#FEE2E2', color: '#DC2626' },
  priced:          { icon: '💰', label: 'Báo giá',         bg: '#FFF3EE', color: '#E05B28' },
  price_updated:   { icon: '✏️', label: 'Sửa giá',         bg: '#EFF6FF', color: '#2563EB' },
  setup:           { icon: '⚙️', label: 'Thiết lập',       bg: '#F5F3FF', color: '#7C3AED' },
  decided_import:  { icon: '🏁', label: 'Chốt nhập',       bg: '#ECFDF5', color: '#059669' },
  decided_reject:  { icon: '🚫', label: 'Từ chối nhập',    bg: '#FEF2F2', color: '#DC2626' },
  cancelled:       { icon: '↩️', label: 'Huỷ nhập',        bg: '#F3F4F6', color: '#6B7280' },
}

const FILTER_TABS = [
  { key: 'all',            label: 'Tất cả' },
  { key: 'approved',       label: '✅ Duyệt hàng' },
  { key: 'priced',         label: '💰 Báo giá' },
  { key: 'price_updated',  label: '✏️ Sửa giá' },
  { key: 'setup',          label: '⚙️ Thiết lập' },
  { key: 'decided_import', label: '🏁 Chốt nhập' },
  { key: 'rejected',       label: '❌ Từ chối' },
]

function fmtCny(v: number) { return v ? `¥${Number(v).toFixed(2)}` : '—' }

function PriceCompareTable({ meta }: { meta: Record<string, unknown> }) {
  const o = (meta.old as Record<string, number>) || {}
  const n = (meta.new as Record<string, number>) || {}

  // Fallback for old log entries that don't have full field data
  if (!meta.old && !meta.new) {
    const op = Number(meta.oldPrice || 0), np = Number(meta.newPrice || 0)
    return (
      <p className="text-[11px] text-[#6B7280] mt-0.5">
        Giá mới: <strong>{fmt(np)}/chiếc</strong> · Trước: {fmt(op)}
      </p>
    )
  }

  const rows: { label: string; oldVal: string; newVal: string }[] = [
    { label: 'Giá xuất xưởng (¥/chiếc)', oldVal: fmtCny(o.factoryCny),          newVal: fmtCny(n.factoryCny) },
    { label: 'Số lượng/thùng (chiếc)',    oldVal: o.qtyPerBox ? String(o.qtyPerBox) : '—', newVal: n.qtyPerBox ? String(n.qtyPerBox) : '—' },
    { label: 'Cân nặng/thùng (kg)',       oldVal: o.weightKg  ? `${o.weightKg} kg`  : '—', newVal: n.weightKg  ? `${n.weightKg} kg`  : '—' },
    { label: 'Số khối/thùng (m³)',        oldVal: o.volumeM3  ? `${o.volumeM3} m³`  : '—', newVal: n.volumeM3  ? `${n.volumeM3} m³`  : '—' },
    { label: 'Cước nội địa TQ (¥/chiếc)',  oldVal: fmtCny(o.domesticFreightCny),     newVal: fmtCny(n.domesticFreightCny) },
    { label: 'Phí kiểm định (₫/chiếc)',   oldVal: o.inspectionVnd ? fmt(o.inspectionVnd) : '—', newVal: n.inspectionVnd ? fmt(n.inspectionVnd) : '—' },
    { label: 'Phí kiểm dịch (¥/chiếc)',   oldVal: fmtCny(o.quarantineCny),          newVal: fmtCny(n.quarantineCny) },
    { label: 'Giá nhập (₫/chiếc)',        oldVal: o.totalPerUnit ? fmt(o.totalPerUnit) : '—', newVal: n.totalPerUnit ? fmt(n.totalPerUnit) : '—' },
  ]

  return (
    <div className="mt-2 rounded-lg border border-[#BFDBFE] overflow-hidden">
      <div className="grid grid-cols-3 bg-[#EFF6FF] px-2 py-1.5 font-semibold text-[#1D4ED8]" style={{ fontSize: 10 }}>
        <span>Thành phần</span>
        <span className="text-center">Trước</span>
        <span className="text-center">Sau</span>
      </div>
      {rows.map(({ label, oldVal, newVal }) => {
        const changed = oldVal !== newVal
        return (
          <div key={label} className={`grid grid-cols-3 px-2 py-1 border-t border-[#DBEAFE] ${changed ? 'bg-[#FFFBEB]' : ''}`} style={{ fontSize: 11 }}>
            <span className="text-[#6B7280] truncate pr-1">{label}</span>
            <span className={`text-center ${changed ? 'line-through text-[#9CA3AF]' : 'text-[#374151]'}`}>{oldVal}</span>
            <span className={`text-center font-semibold ${changed ? 'text-[#E05B28]' : 'text-[#374151]'}`}>{newVal}</span>
          </div>
        )
      })}
    </div>
  )
}

function MetaLine({ type, meta }: { type: ActivityType; meta?: Record<string, unknown> }) {
  if (!meta) return null

  if (type === 'price_updated') return <PriceCompareTable meta={meta} />

  const parts: string[] = []
  if (type === 'approved' && meta.checkCode)
    parts.push(`Mã: ${meta.checkCode}`)
  if (type === 'priced' && meta.newPrice)
    parts.push(`Giá: ${fmt(Number(meta.newPrice))}/chiếc`)
  if (type === 'decided_import') {
    if (meta.importQty)       parts.push(`${meta.importQty} thùng`)
    if (meta.totalImportCost) parts.push(`Tổng: ${fmt(Number(meta.totalImportCost))}`)
    if (meta.importWarehouse) parts.push(`Kho: ${meta.importWarehouse}`)
  }
  if ((type === 'rejected' || type === 'decided_reject' || type === 'cancelled') && meta.reason)
    parts.push(`Lý do: ${meta.reason}`)
  if (type === 'setup' && meta.assignedUsers)
    parts.push(`Phân công: ${meta.assignedUsers}`)
  if (!parts.length) return null
  return <p className="text-[11px] text-[#6B7280] mt-0.5">{parts.join(' · ')}</p>
}

export default function ActivitiesContent() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => { setActivities(data.activities || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = activities.filter(a => {
    if (filter !== 'all' && a.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.productName.toLowerCase().includes(q) ||
        (a.checkCode || '').toLowerCase().includes(q) ||
        a.userName.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group by date
  const groups: { dateLabel: string; items: Activity[] }[] = []
  for (const a of filtered) {
    const label = formatDateGroup(a.timestamp)
    const last = groups[groups.length - 1]
    if (last && last.dateLabel === label) {
      last.items.push(a)
    } else {
      groups.push({ dateLabel: label, items: [a] })
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#111827] mb-6">📋 Nhật ký hoạt động</h1>
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] h-16" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#111827]">📋 Nhật ký hoạt động</h1>
        <p className="text-[#6B7280] mt-1 text-sm">Toàn bộ thay đổi trạng thái và giá sản phẩm</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm theo tên SP, mã check, người thực hiện..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#E05B28] bg-white"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: filter === tab.key ? '#E05B28' : '#F3F4F6',
              color:           filter === tab.key ? 'white'   : '#6B7280',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-[#6B7280]">Chưa có hoạt động nào</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.dateLabel}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-[#6B7280] whitespace-nowrap">{group.dateLabel}</span>
                <div className="flex-1 h-px bg-[#E5E7EB]" />
              </div>

              <div className="space-y-2">
                {group.items.map(a => {
                  const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.rejected
                  return (
                    <div key={a.id} className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3 flex gap-3 items-start">
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5"
                        style={{ backgroundColor: cfg.bg }}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          {/* Type badge */}
                          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          {/* CheckCode */}
                          {a.checkCode && (
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
                              style={{ background: '#FFF3EE', color: '#E05B28' }}>
                              {a.checkCode}
                            </span>
                          )}
                        </div>

                        {/* Product name */}
                        <p className="text-sm font-semibold text-[#111827] mt-1 leading-tight truncate">
                          {a.productName}
                        </p>

                        {/* Meta info */}
                        <MetaLine type={a.type} meta={a.meta} />

                        {/* Footer */}
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#9CA3AF]">
                          <span>👤 {a.userName}</span>
                          <span>·</span>
                          <span title={new Date(a.timestamp).toLocaleString('vi-VN')}>
                            {relativeTime(a.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
