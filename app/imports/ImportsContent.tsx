'use client'

import { useEffect, useState } from 'react'

function fmt(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
}

export default function ImportsContent() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/imports')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#111827] mb-6">Đã nhập</h1>
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] h-16" />)}
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-[#6B7280]">Không thể tải dữ liệu</div>

  const products: any[] = data.products || []
  const filtered = filter
    ? products.filter(p => p.assignedBuyerId === filter)
    : products

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">📦 Danh sách đã nhập</h1>
        <p className="text-[#6B7280] mt-1">Tổng hợp các mã đã chốt nhập hàng</p>
      </div>

      {/* Tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#DCFCE7' }}>📦</div>
          <div>
            <div className="text-2xl font-bold text-[#111827]">{products.length}</div>
            <div className="text-sm text-[#6B7280]">Mã đã nhập</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#FFF3EE' }}>💰</div>
          <div>
            <div className="text-xl font-bold" style={{ color: '#E05B28' }}>{fmt(data.totalCost)}</div>
            <div className="text-sm text-[#6B7280]">Tổng tiền nhập</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#EDE9FE' }}>📦</div>
          <div>
            <div className="text-2xl font-bold text-[#111827]">{data.totalQty?.toLocaleString()}</div>
            <div className="text-sm text-[#6B7280]">Tổng SL (thùng)</div>
          </div>
        </div>
      </div>

      {/* NV summary */}
      {data.nvSummary?.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-6">
          <h2 className="font-semibold text-[#111827] mb-3">👥 Tổng hợp theo NVMH</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#6B7280] border-b border-[#E5E7EB]">
                  <th className="text-left pb-2 font-medium">Nhân viên</th>
                  <th className="text-right pb-2 font-medium">Số mã</th>
                  <th className="text-right pb-2 font-medium">Tổng tiền nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {data.nvSummary.map((nv: any) => (
                  <tr key={nv.id}
                    onClick={() => setFilter(filter === nv.id ? '' : nv.id)}
                    className="cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                    style={{ backgroundColor: filter === nv.id ? '#FFF3EE' : '' }}>
                    <td className="py-2 font-medium text-[#111827]">
                      {filter === nv.id && <span className="mr-1 text-[#E05B28]">▶</span>}
                      {nv.name || nv.id}
                    </td>
                    <td className="py-2 text-right text-[#6B7280]">{nv.count} mã</td>
                    <td className="py-2 text-right font-semibold" style={{ color: '#E05B28' }}>{fmt(nv.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filter && (
            <button onClick={() => setFilter('')} className="mt-2 text-xs text-[#6B7280] hover:underline">
              ✕ Bỏ lọc
            </button>
          )}
        </div>
      )}

      {/* Product list */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#111827]">
            {filter ? `Lọc theo NV — ${filtered.length} mã` : `Tất cả — ${filtered.length} mã`}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#6B7280]">Không có dữ liệu</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#6B7280] bg-[#F9FAFB]">
                  <th className="text-left px-4 py-2 font-medium">Mã check</th>
                  <th className="text-left px-4 py-2 font-medium">Tên sản phẩm</th>
                  <th className="text-right px-4 py-2 font-medium">Giá/chiếc</th>
                  <th className="text-right px-4 py-2 font-medium">SL (thùng)</th>
                  <th className="text-right px-4 py-2 font-medium">Tổng tiền</th>
                  <th className="text-left px-4 py-2 font-medium">NVMH</th>
                  <th className="text-left px-4 py-2 font-medium">Ngày chốt</th>
                  <th className="text-left px-4 py-2 font-medium">Kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: '#FFF3EE', color: '#E05B28' }}>
                        {p.checkCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#111827] max-w-[200px] truncate">{p.name}</td>
                    <td className="px-4 py-3 text-right text-[#374151]">{fmt(p.totalPerUnit)}</td>
                    <td className="px-4 py-3 text-right text-[#374151]">{p.importQty}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: '#E05B28' }}>{fmt(p.totalImportCost)}</td>
                    <td className="px-4 py-3 text-[#374151]">{p.assignedBuyerName || '—'}</td>
                    <td className="px-4 py-3 text-[#6B7280] text-xs">{p.decidedAt ? new Date(p.decidedAt).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{p.importWarehouse || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#FFF3EE] font-semibold">
                  <td className="px-4 py-2 text-xs" colSpan={4} style={{ color: '#E05B28' }}>TỔNG CỘNG ({filtered.length} mã)</td>
                  <td className="px-4 py-2 text-right text-sm" style={{ color: '#E05B28' }}>
                    {fmt(filtered.reduce((s: number, p: any) => s + p.totalImportCost, 0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
