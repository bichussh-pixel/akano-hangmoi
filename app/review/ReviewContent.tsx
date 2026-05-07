'use client'

import { useEffect, useState } from 'react'
import ProductStatusBadge from '@/components/ui/ProductStatusBadge'

const CATEGORIES = ['Tất cả', 'Gia dụng', 'Thể thao', 'Tiện ích', 'Sắp xếp nhà']

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫'
}

export default function ReviewContent() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('Tất cả')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [approving, setApproving] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('/api/review/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  const filtered = filter === 'Tất cả'
    ? products
    : products.filter(p => (p.category || '').toLowerCase().includes(filter.toLowerCase()))

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(p => p.id)))
  }

  async function handleApprove() {
    if (selected.size === 0) return
    setApproving(true)
    try {
      const res = await fetch('/api/products/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [...selected] }),
      })
      const data = await res.json()
      showToast(`Đã duyệt ${data.results?.length || 0} sản phẩm`)
      setSelected(new Set())
      await fetchProducts()
    } catch {
      showToast('Lỗi khi duyệt sản phẩm')
    } finally {
      setApproving(false)
    }
  }

  async function saveDesc(id: string) {
    await fetch(`/api/review/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editDesc }),
    })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, description: editDesc } : p))
    setEditingId(null)
    showToast('Đã lưu mô tả')
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#111827] mb-6">Duyệt hàng</h1>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">✅ Duyệt hàng</h1>
          <p className="text-[#6B7280] mt-1">Xem xét và phê duyệt sản phẩm từ Kalodata</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: '#E05B28' }}
          >
            {approving ? 'Đang duyệt...' : `✅ Duyệt ${selected.size} sản phẩm`}
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              backgroundColor: filter === cat ? '#E05B28' : '#F3F4F6',
              color: filter === cat ? 'white' : '#6B7280',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-[#6B7280]">Không có sản phẩm cần duyệt</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-3">
            <button onClick={toggleAll} className="text-sm text-[#E05B28] hover:underline">
              {selected.size === filtered.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
            <span className="text-[#6B7280] text-sm">{filtered.length} sản phẩm</span>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {filtered.map(p => (
              <div key={p.id} className="p-5">
                <div className="flex gap-4">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="mt-1 w-4 h-4 accent-[#E05B28]"
                  />
                  <div className="w-14 h-14 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-2xl shrink-0">
                    {p.imageUrl || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[#111827] leading-tight">{p.name}</h3>
                      <ProductStatusBadge status={p.status} />
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-[#6B7280] mb-2">
                      <span>💰 {fmt(p.marketPrice)}</span>
                      {p.growthRate && <span className="text-green-600">+{Number(p.growthRate).toFixed(1)}%</span>}
                      {p.sales30d && <span>📦 {p.sales30d.toLocaleString()} đơn/tháng</span>}
                      {p.category && (
                        <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
                          {p.category}
                        </span>
                      )}
                    </div>
                    {editingId === p.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#E05B28]"
                        />
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => saveDesc(p.id)} className="text-xs px-3 py-1 rounded-lg text-white" style={{ backgroundColor: '#E05B28' }}>Lưu</button>
                          <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1 rounded-lg bg-[#F3F4F6] text-[#6B7280]">Hủy</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#6B7280] mt-1">
                        {p.description || 'Chưa có mô tả'}
                        <button
                          onClick={() => { setEditingId(p.id); setEditDesc(p.description || '') }}
                          className="ml-2 text-[#E05B28] hover:underline"
                        >
                          ✏️ Sửa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
