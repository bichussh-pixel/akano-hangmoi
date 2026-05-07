'use client'

import { useState } from 'react'

const CATEGORIES = ['Tất cả', 'Gia dụng', 'Thể thao', 'Tiện ích', 'Sắp xếp nhà']
const DATE_RANGES = [
  { value: 'last7Day', label: '7 ngày' },
  { value: 'last30Day', label: '30 ngày' },
  { value: 'last90Day', label: '90 ngày' },
]
const SORT_OPTIONS = [
  { value: 'growth', label: 'Tăng trưởng' },
  { value: 'sales', label: 'Doanh số' },
  { value: 'price', label: 'Giá' },
]
const LOADING_STEPS = [
  'Kết nối Kalodata API...',
  'Đang tải dữ liệu sản phẩm...',
  'Lọc theo danh mục...',
  'Tính toán xếp hạng...',
  'Hoàn tất!',
]

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫'
}

export default function ImportContent() {
  const [category, setCategory] = useState('Tất cả')
  const [keyword, setKeyword] = useState('')
  const [dateRange, setDateRange] = useState('last30Day')
  const [sortBy, setSortBy] = useState('growth')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [imported, setImported] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState('')
  const [isMock, setIsMock] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleFetch() {
    setLoading(true)
    setLoadStep(0)
    setProducts([])
    setSelected(new Set())

    // Simulate step messages
    for (let i = 0; i < LOADING_STEPS.length - 1; i++) {
      await new Promise(r => setTimeout(r, 500))
      setLoadStep(i + 1)
    }

    try {
      const res = await fetch('/api/kalodata/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange, sortBy, keyword }),
      })
      const data = await res.json()
      let list = data.products || []
      if (category !== 'Tất cả') {
        list = list.filter((p: any) => (p.category || '').toLowerCase().includes(category.toLowerCase()))
      }
      if (keyword) {
        list = list.filter((p: any) => (p.name || '').toLowerCase().includes(keyword.toLowerCase()))
      }
      setProducts(list)
      setIsMock(data.mock || false)
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === products.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map((p: any) => p.id)))
    }
  }

  async function handleImport() {
    if (selected.size === 0) return
    setImporting(true)
    const toImport = products.filter((p: any) => selected.has(p.id))
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: toImport }),
      })
      const data = await res.json()
      setImported(prev => [...prev, ...toImport.map((p: any) => ({ ...p, _imported: true }))])
      setSelected(new Set())
      showToast(`Đã import ${data.imported} sản phẩm${data.skipped > 0 ? ` (${data.skipped} bỏ qua trùng lặp)` : ''}`)
    } catch {
      showToast('Lỗi khi import')
    } finally {
      setImporting(false)
    }
  }

  // Sort by growth for rank badges
  const sorted = [...products].sort((a, b) => (b.growth || 0) - (a.growth || 0))
  const top3Ids = new Set(sorted.slice(0, 3).map((p: any) => p.id))

  return (
    <div className="max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">📥 Import Kalodata</h1>
        <p className="text-[#6B7280] mt-1">Tìm kiếm và import sản phẩm tiềm năng từ Kalodata</p>
      </div>

      {/* Rule reminder */}
      <div className="bg-[#FFF3EE] border border-orange-200 rounded-xl p-4 mb-6 text-sm">
        <div className="font-semibold text-[#E05B28] mb-1">Quy tắc lọc sản phẩm</div>
        <div className="text-[#111827]">
          <span className="text-green-700">✓ Cho phép:</span> Gia dụng / Thể thao / Tiện ích / Sắp xếp nhà | Giá 5.000₫ – 150.000₫
        </div>
        <div className="text-[#111827] mt-1">
          <span className="text-red-600">✕ Cấm:</span> Hóa chất / Tinh dầu / Nước hoa / Mỹ phẩm
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: category === cat ? '#E05B28' : '#F3F4F6',
                color: category === cat ? 'white' : '#6B7280',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Tìm theo tên sản phẩm..."
            className="flex-1 min-w-48 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]"
          />
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
          >
            {DATE_RANGES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
          >
            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button
            onClick={handleFetch}
            disabled={loading}
            className="px-5 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: '#E05B28' }}
          >
            {loading ? '⏳ Đang tải...' : '🚀 Lấy từ Kalodata'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 mb-5 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-[#E05B28] border-t-transparent animate-spin" />
            <div className="text-sm text-[#6B7280]">{LOADING_STEPS[loadStep]}</div>
            <div className="flex gap-1">
              {LOADING_STEPS.map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i <= loadStep ? '#E05B28' : '#E5E7EB' }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product list */}
      {products.length > 0 && !loading && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] mb-5">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="text-sm text-[#E05B28] font-medium hover:underline"
              >
                {selected.size === products.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
              <span className="text-[#6B7280] text-sm">{products.length} sản phẩm</span>
              {isMock && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Demo data</span>}
            </div>
            {selected.size > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: '#E05B28' }}
              >
                {importing ? 'Đang import...' : `📥 Import ${selected.size} SP`}
              </button>
            )}
          </div>

          <div className="divide-y divide-[#F3F4F6]">
            {products.map((p: any, idx: number) => {
              const rank = sorted.findIndex((s: any) => s.id === p.id) + 1
              const isTop3 = top3Ids.has(p.id)
              const rankColors = ['#FF4757', '#E05B28', '#D97706']

              return (
                <div
                  key={p.id}
                  className="flex gap-4 p-4 hover:bg-[#FAFAFA] cursor-pointer"
                  onClick={() => toggleSelect(p.id)}
                >
                  <div className="flex items-start pt-0.5">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 accent-[#E05B28]"
                    />
                  </div>

                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-[#F3F4F6] shrink-0">
                    {p.img || '📦'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      {isTop3 && (
                        <span
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: rankColors[rank - 1] }}
                        >
                          {rank}
                        </span>
                      )}
                      <div className="text-sm font-semibold text-[#111827] leading-tight">{p.name}</div>
                    </div>
                    <div className="text-xs text-[#6B7280] mb-2 line-clamp-2">{p.description}</div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="text-[#6B7280]">
                        🏪 {p.shopName || p.shop_name || 'N/A'}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}
                      >
                        {p.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-bold text-[#111827]">{fmt(p.market_price || p.price)}</div>
                    <div className="text-xs text-[#6B7280]">{(p.sales30d || 0).toLocaleString()} đơn/tháng</div>
                    <div
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
                    >
                      +{p.growth?.toFixed(1) || 0}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Imported queue */}
      {imported.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h3 className="font-semibold text-[#111827] mb-3">
            ✅ Đã import ({imported.length} sản phẩm)
          </h3>
          <div className="space-y-2">
            {imported.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-[#F3F4F6] last:border-0">
                <span className="text-lg">{p.img || '📦'}</span>
                <span className="text-sm text-[#111827]">{p.name}</span>
                <span className="ml-auto text-xs text-green-600">Đã import</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
