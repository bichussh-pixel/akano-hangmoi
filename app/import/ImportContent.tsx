'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'

const CATEGORIES = ['Tất cả', 'Gia dụng', 'Thể thao', 'Tiện ích', 'Sắp xếp nhà']
const DATE_RANGES = [
  { value: 'last7Day',  label: '7 ngày' },
  { value: 'last30Day', label: '30 ngày' },
  { value: 'last90Day', label: '90 ngày' },
]
const SORT_OPTIONS = [
  { value: 'growth', label: 'Tăng trưởng' },
  { value: 'sales',  label: 'Doanh số' },
  { value: 'price',  label: 'Giá' },
]
const LOADING_STEPS = [
  'Kết nối Kalodata API...',
  'Đang tải dữ liệu sản phẩm...',
  'Lọc theo danh mục...',
  'Tính toán xếp hạng...',
  'Hoàn tất!',
]

// Kalodata XLSX column mapping
const KALODATA_COL: Record<string, string[]> = {
  name:        ['tên sản phẩm'],
  imageUrl:    ['liên kết hình ảnh'],
  category:    ['danh mục'],
  price:       ['đơn giá bình quân(₫)', 'đơn giá bình quân', 'giá bán(₫)', 'giá bán'],
  salesVolume: ['lượt bán', 'doanh số bán ra', 'doanh số'],
  revenue:     ['doanh thu(₫)', 'doanh thu'],
  growthRate:  ['tốc độ tăng trưởng doanh thu', 'tốc độ tăng trưởng'],
  kalodataLink:['link chi tiết trên kalodata', 'link kalodata'],
  tiktokLink:  ['link tiktok', 'tiktok'],
}

function getCol(row: Record<string, unknown>, key: string): string {
  const aliases = KALODATA_COL[key] || []
  const rLower: Record<string, unknown> = {}
  Object.entries(row).forEach(([k, v]) => { rLower[k.toLowerCase().trim()] = v })
  for (const alias of aliases) {
    if (rLower[alias] !== undefined && rLower[alias] !== '') return String(rLower[alias])
  }
  return ''
}

function fmt(n: number) {
  return Math.round(n || 0).toLocaleString('vi-VN') + '₫'
}

function isUrl(s?: string): boolean {
  return !!s && (s.startsWith('http://') || s.startsWith('https://'))
}

type TabType = 'kalodata' | 'excel'

export default function ImportContent() {
  const [tab, setTab] = useState<TabType>('kalodata')

  // Kalodata API state
  const [category,   setCategory]  = useState('Tất cả')
  const [keyword,    setKeyword]   = useState('')
  const [dateRange,  setDateRange] = useState('last30Day')
  const [sortBy,     setSortBy]    = useState('growth')
  const [products,   setProducts]  = useState<any[]>([])
  const [loading,    setLoading]   = useState(false)
  const [loadStep,   setLoadStep]  = useState(0)
  const [isMock,     setIsMock]    = useState(false)
  const [page,       setPage]      = useState(1)
  const [totalCount, setTotalCount]= useState(0)

  // Excel state
  const excelRef = useRef<HTMLInputElement>(null)
  const [excelProducts, setExcelProducts] = useState<any[]>([])
  const [excelLoading,  setExcelLoading]  = useState(false)
  const [excelSelected, setExcelSelected] = useState<Set<string>>(new Set())

  // Shared
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [imported,   setImported]   = useState<any[]>([])
  const [importing,  setImporting]  = useState(false)
  const [toast,      setToast]      = useState('')
  const [imgErr,     setImgErr]     = useState<Record<string, boolean>>({})

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // ── Kalodata API ──────────────────────────────────────────────────────────
  async function fetchPage(p: number) {
    setLoading(true)
    setLoadStep(0)
    if (p === 1) { setProducts([]); setSelected(new Set()) }
    for (let i = 0; i < LOADING_STEPS.length - 1; i++) {
      await new Promise(r => setTimeout(r, 400))
      setLoadStep(i + 1)
    }
    try {
      const res = await fetch('/api/kalodata/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange, sortBy, keyword, page: p }),
      })
      const data = await res.json()
      let list = data.products || []
      if (category !== 'Tất cả') list = list.filter((p: any) => (p.category || '').toLowerCase().includes(category.toLowerCase()))
      if (keyword) list = list.filter((p: any) => (p.name || '').toLowerCase().includes(keyword.toLowerCase()))
      setProducts(list)
      setTotalCount(data.total || list.length)
      setPage(p)
      setIsMock(data.mock || false)
    } finally {
      setLoading(false)
    }
  }
  function handleFetch() { fetchPage(1) }

  // ── Excel upload ──────────────────────────────────────────────────────────
  async function handleExcelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExcelLoading(true)
    setExcelProducts([])
    setExcelSelected(new Set())
    try {
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(new Uint8Array(buf), { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[]
      if (!rows.length) { showToast('File Excel trống'); return }

      const parsed = rows.map((row, i) => ({
        id:          `EXCEL-${Date.now()}-${i}`,
        name:        getCol(row, 'name') || `SP ${i + 1}`,
        img:         getCol(row, 'imageUrl'),       // actual image URL
        imageUrl:    getCol(row, 'imageUrl'),
        category:    getCol(row, 'category') || 'Gia dụng',
        market_price:parseFloat(getCol(row, 'price').replace(/[^\d.]/g, '')) || 0,
        price:       parseFloat(getCol(row, 'price').replace(/[^\d.]/g, '')) || 0,
        sales30d:    parseInt(getCol(row, 'salesVolume')) || 0,
        growth:      parseFloat(getCol(row, 'growthRate')) || 0,
        kaloUrl:     getCol(row, 'kalodataLink'),
        shopUrl:     getCol(row, 'tiktokLink'),   // best-selling shop = TikTok link from Kalodata
        description: '',
        shopName:    '',
        source:      'excel' as const,
      })).filter(p => p.name && !p.name.startsWith('SP '))

      if (!parsed.length) { showToast('Không đọc được dữ liệu từ Excel'); return }
      setExcelProducts(parsed)
      setExcelSelected(new Set(parsed.map(p => p.id)))
      showToast(`📊 Đọc được ${parsed.length} sản phẩm từ Excel`)
    } catch (err: any) {
      showToast('Lỗi đọc Excel: ' + err.message)
    } finally {
      setExcelLoading(false)
      e.target.value = ''
    }
  }

  // ── Import (shared for both tabs) ─────────────────────────────────────────
  async function handleImport(list: any[], sel: Set<string>) {
    if (sel.size === 0) return
    setImporting(true)
    const toImport = list.filter((p: any) => sel.has(p.id))
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: toImport }),
      })
      const data = await res.json()
      setImported(prev => [...prev, ...toImport.map((p: any) => ({ ...p, _imported: true }))])
      if (tab === 'kalodata') setSelected(new Set())
      else setExcelSelected(new Set())
      showToast(`Đã import ${data.added ?? sel.size} sản phẩm${(data.skipped ?? 0) > 0 ? ` (${data.skipped} bỏ qua trùng)` : ''}`)
    } catch {
      showToast('Lỗi khi import')
    } finally {
      setImporting(false)
    }
  }

  // ── Sort / rank ───────────────────────────────────────────────────────────
  const sorted  = [...products].sort((a, b) => (b.growth || 0) - (a.growth || 0))
  const top3Ids = new Set(sorted.slice(0, 3).map((p: any) => p.id))
  const rankColors = ['#FF4757', '#E05B28', '#D97706']

  // ── Product card (shared renderer) ───────────────────────────────────────
  function ProductRow({ p, sel, onToggle, rank, isTop3 }: {
    p: any; sel: Set<string>; onToggle: (id: string) => void
    rank?: number; isTop3?: boolean
  }) {
    const hasImg = isUrl(p.img || p.imageUrl)
    const imgSrc = p.img || p.imageUrl
    const shopLink = isUrl(p.shopUrl) ? p.shopUrl : null

    return (
      <div className="flex gap-4 p-4 hover:bg-[#FAFAFA] cursor-pointer transition-colors"
        onClick={() => onToggle(p.id)}>
        <div className="flex items-start pt-0.5">
          <input type="checkbox" checked={sel.has(p.id)} onChange={() => onToggle(p.id)}
            onClick={e => e.stopPropagation()} className="w-4 h-4 accent-[#E05B28]" />
        </div>

        {/* Image */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F3F4F6] border border-[#E5E7EB] shrink-0 flex items-center justify-center text-2xl">
          {hasImg && !imgErr[p.id]
            ? <img src={imgSrc} alt={p.name} className="w-full h-full object-cover"
                onError={() => setImgErr(prev => ({ ...prev, [p.id]: true }))} />
            : <span>{p.img && !isUrl(p.img) ? p.img : '📦'}</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1 flex-wrap">
            {isTop3 && rank && (
              <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: rankColors[rank - 1] }}>
                {rank}
              </span>
            )}
            <div className="text-sm font-semibold text-[#111827] leading-tight">{p.name}</div>
          </div>
          <div className="text-xs text-[#6B7280] mb-2 line-clamp-2">{p.description}</div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3 text-xs mb-2">
            <span className="text-[#374151] font-medium">
              📦 <span className="font-bold text-[#111827]">{(p.sales30d || 0).toLocaleString('vi-VN')}</span> đơn/30 ngày
            </span>
            {(p.sellerCount || p.seller_count) > 0 && (
              <span className="text-[#6B7280]">
                🏪 <span className="font-semibold text-[#374151]">{(p.sellerCount || p.seller_count).toLocaleString('vi-VN')}</span> shop đang bán
              </span>
            )}
          </div>

          {/* Tags & links */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
              {p.category}
            </span>
            {shopLink && (
              <a href={shopLink} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-white font-bold no-underline"
                style={{ background: 'linear-gradient(135deg,#EC4899,#DB2777)', fontSize: 11 }}>
                🏆 Shop bán chạy
              </a>
            )}
            {isUrl(p.kaloUrl) && (
              <a href={p.kaloUrl} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="px-2.5 py-0.5 rounded-lg font-semibold no-underline"
                style={{ background: '#EEF2FF', color: '#4361EE', border: '1px solid #C7D2FE', fontSize: 11 }}>
                🔗 Kalodata
              </a>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 space-y-1 min-w-[90px]">
          <div className="font-bold text-[#111827] text-sm">{fmt(p.market_price || p.price || p.marketPrice)}</div>
          <div className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
            +{(p.growth || p.growthRate || 0).toFixed(1)}%
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg max-w-sm">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">📥 Import sản phẩm</h1>
        <p className="text-[#6B7280] mt-1 text-sm">Tìm kiếm từ Kalodata API hoặc upload file Excel</p>
      </div>

      {/* Rule reminder */}
      <div className="bg-[#FFF3EE] border border-orange-200 rounded-xl p-4 mb-5 text-sm">
        <div className="font-semibold text-[#E05B28] mb-1">Quy tắc lọc sản phẩm</div>
        <div className="text-[#111827]">
          <span className="text-green-700">✓</span> Gia dụng / Thể thao / Tiện ích / Sắp xếp nhà · Giá 5.000₫–150.000₫
        </div>
        <div className="text-[#111827] mt-0.5">
          <span className="text-red-600">✕</span> Hóa chất · Tinh dầu · Nước hoa · Mỹ phẩm
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        {([['kalodata', '🚀 Kalodata API'], ['excel', '📊 Upload Excel']] as [TabType, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              backgroundColor: tab === t ? '#E05B28' : '#F3F4F6',
              color: tab === t ? 'white' : '#6B7280',
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Tab: Kalodata API ── */}
      {tab === 'kalodata' && (
        <>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-5">
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{ backgroundColor: category === cat ? '#E05B28' : '#F3F4F6', color: category === cat ? 'white' : '#6B7280' }}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <input value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="Tìm theo tên sản phẩm..."
                className="flex-1 min-w-48 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]" />
              <select value={dateRange} onChange={e => setDateRange(e.target.value)}
                className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none">
                {DATE_RANGES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none">
                {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={handleFetch} disabled={loading}
                className="px-5 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-60"
                style={{ backgroundColor: '#E05B28' }}>
                {loading ? '⏳ Đang tải...' : '🚀 Lấy từ Kalodata'}
              </button>
            </div>
          </div>

          {loading && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 mb-5 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-[#E05B28] border-t-transparent animate-spin" />
                <div className="text-sm text-[#6B7280]">{LOADING_STEPS[loadStep]}</div>
                <div className="flex gap-1">
                  {LOADING_STEPS.map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: i <= loadStep ? '#E05B28' : '#E5E7EB' }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {products.length > 0 && !loading && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] mb-5">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelected(prev => prev.size === products.length ? new Set() : new Set(products.map((p: any) => p.id)))}
                    className="text-sm text-[#E05B28] font-medium hover:underline">
                    {selected.size === products.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                  <span className="text-[#6B7280] text-sm">{products.length} sản phẩm</span>
                  {isMock && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Demo data</span>}
                </div>
                {selected.size > 0 && (
                  <button onClick={() => handleImport(products, selected)} disabled={importing}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                    style={{ backgroundColor: '#E05B28' }}>
                    {importing ? 'Đang import...' : `📥 Import ${selected.size} SP`}
                  </button>
                )}
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                {products.map((p: any) => {
                  const rank = sorted.findIndex((s: any) => s.id === p.id) + 1
                  return <ProductRow key={p.id} p={p} sel={selected}
                    onToggle={id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
                    rank={rank} isTop3={top3Ids.has(p.id)} />
                })}
              </div>

              {/* Pagination */}
              {totalCount > 20 && (
                <div className="px-5 py-3 border-t border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-xs text-[#6B7280]">
                    Trang {page} · Hiển thị {products.length}/{totalCount} sản phẩm
                  </span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <button onClick={() => fetchPage(page - 1)} disabled={loading}
                        className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] hover:border-[#E05B28] hover:text-[#E05B28] disabled:opacity-50">
                        ← Trang trước
                      </button>
                    )}
                    <button onClick={() => fetchPage(page + 1)} disabled={loading || products.length < 20}
                      className="px-3 py-1.5 text-xs rounded-lg text-white disabled:opacity-50"
                      style={{ backgroundColor: '#E05B28' }}>
                      Trang sau →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Excel upload ── */}
      {tab === 'excel' && (
        <>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 mb-5">
            <input ref={excelRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={handleExcelFile} />
            <div className="text-center">
              <div className="text-5xl mb-3">📊</div>
              <div className="text-base font-semibold text-[#111827] mb-1">Upload file Excel từ Kalodata</div>
              <div className="text-sm text-[#6B7280] mb-4">
                File Kalodata_Product_*.xlsx — cột: Tên sản phẩm, Liên kết hình ảnh, Link TikTok, Link Kalodata, Doanh thu, Lượt bán, Tốc độ tăng trưởng
              </div>
              <button onClick={() => excelRef.current?.click()} disabled={excelLoading}
                className="px-6 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
                style={{ backgroundColor: '#059669' }}>
                {excelLoading ? '⏳ Đang đọc file...' : '📂 Chọn file Excel'}
              </button>
            </div>
          </div>

          {excelProducts.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] mb-5">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setExcelSelected(prev => prev.size === excelProducts.length ? new Set() : new Set(excelProducts.map(p => p.id)))}
                    className="text-sm text-[#E05B28] font-medium hover:underline">
                    {excelSelected.size === excelProducts.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                  <span className="text-[#6B7280] text-sm">{excelProducts.length} sản phẩm từ Excel</span>
                </div>
                {excelSelected.size > 0 && (
                  <button onClick={() => handleImport(excelProducts, excelSelected)} disabled={importing}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                    style={{ backgroundColor: '#E05B28' }}>
                    {importing ? 'Đang import...' : `📥 Import ${excelSelected.size} SP`}
                  </button>
                )}
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                {excelProducts.map(p => (
                  <ProductRow key={p.id} p={p} sel={excelSelected}
                    onToggle={id => setExcelSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Imported queue */}
      {imported.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h3 className="font-semibold text-[#111827] mb-3">✅ Đã import ({imported.length} sản phẩm)</h3>
          <div className="space-y-2">
            {imported.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-[#F3F4F6] last:border-0">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#F3F4F6] flex items-center justify-center text-base shrink-0">
                  {isUrl(p.img || p.imageUrl)
                    ? <img src={p.img || p.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <span>{p.img && !isUrl(p.img) ? p.img : '📦'}</span>
                  }
                </div>
                <span className="text-sm text-[#111827] flex-1 min-w-0 truncate">{p.name}</span>
                <span className="text-xs text-green-600 shrink-0">Đã import</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
