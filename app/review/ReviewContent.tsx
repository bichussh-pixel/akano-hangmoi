'use client'

import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import ProductStatusBadge from '@/components/ui/ProductStatusBadge'

const CATEGORIES = ['Tất cả', 'Gia dụng', 'Thể thao', 'Tiện ích', 'Sắp xếp nhà']

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

function parsePrice(s: string): number {
  const n = parseFloat(s.replace(/[^\d.]/g, ''))
  return isNaN(n) ? 0 : n
}

function fmt(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
}
function fmtNum(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function isUrl(s?: string): boolean {
  return !!s && (s.startsWith('http://') || s.startsWith('https://'))
}

function getBestShopLink(p: any): string | null {
  const u = p.shopUrl || ''
  if (u && !u.includes('shopee.vn/shop/') && isUrl(u)) return u
  if (p.name) return `https://www.tiktok.com/search?q=${encodeURIComponent(p.name)}&type=item`
  return null
}
function getKaloLink(p: any): string | null {
  const u = p.kaloUrl || ''
  if (u && !u.match(/kalodata\.com\/product\/\d+$/) && isUrl(u)) return u
  if (p.name) return `https://kalodata.com/vn/product/search?keyword=${encodeURIComponent(p.name)}&region=VN`
  return null
}

function todayKey(): string {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `C${yy}${mm}${dd}`
}

type Spec = { weight: string; dimensions: string; material: string; useCases: string }

// ─── Edit panel for reviewed products ────────────────────────────────────────
function ReviewedEditPanel({ p, onClose, onSaved }: { p: any; onClose: () => void; onSaved: () => void }) {
  const inpCls = 'w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#E05B28] bg-white'
  const [spec, setSpec] = useState<Spec>({
    weight:     p.specWeight     || '',
    dimensions: p.specDimensions || '',
    material:   p.specMaterial   || '',
    useCases:   p.specUseCases   || '',
  })
  const [qty,   setQty]   = useState(String(p.importQty || ''))
  const [price, setPrice] = useState(String(p.estimatedImportPrice || ''))
  const [photos, setPhotos] = useState<string[]>(p.photos || (p.imageUrl ? [p.imageUrl] : []))
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  function updateSpec(field: keyof Spec, value: string) {
    setSpec(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/review/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', specs: spec, qty, estimatedPrice: price, photos }),
      })
      if (res.ok) { onSaved(); onClose() }
      else setToast('Lỗi khi lưu')
    } catch { setToast('Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  return (
    <div className="mt-3 p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]">
      {toast && <div className="text-xs text-red-500 mb-2">{toast}</div>}

      <div className="flex gap-4 mb-3">
        <div>
          <label className="text-xs text-[#6B7280] font-semibold mb-1 block">📦 SL nhập (thùng)</label>
          <input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)}
            placeholder="VD: 500" className={inpCls + ' w-28'} />
        </div>
        <div>
          <label className="text-xs text-[#6B7280] font-semibold mb-1 block">💰 Giá nhập dự kiến (đ/chiếc)</label>
          <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
            placeholder="VD: 45000" className={inpCls + ' w-36'} />
        </div>
      </div>

      <div className="text-xs font-semibold text-blue-700 mb-2">📋 Thông số kỹ thuật</div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs text-[#6B7280] mb-1 block">🏋️ Cân nặng</label>
          <input value={spec.weight} onChange={e => updateSpec('weight', e.target.value)}
            placeholder="VD: 350g/hộp" className={inpCls} />
        </div>
        <div>
          <label className="text-xs text-[#6B7280] mb-1 block">📐 Kích thước</label>
          <input value={spec.dimensions} onChange={e => updateSpec('dimensions', e.target.value)}
            placeholder="VD: 20×15×5cm" className={inpCls} />
        </div>
        <div>
          <label className="text-xs text-[#6B7280] mb-1 block">🧵 Chất liệu</label>
          <input value={spec.material} onChange={e => updateSpec('material', e.target.value)}
            placeholder="VD: Nhựa ABS cao cấp" className={inpCls} />
        </div>
        <div>
          <label className="text-xs text-[#6B7280] mb-1 block">✅ Công dụng</label>
          <input value={spec.useCases} onChange={e => updateSpec('useCases', e.target.value)}
            placeholder="VD: Dùng trong bếp" className={inpCls} />
        </div>
      </div>

      {/* Photo upload */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-blue-700 mb-2">🖼️ Ảnh sản phẩm</div>
        <div className="flex flex-wrap gap-2">
          {photos.map((url: string, i: number) => (
            <div key={i} className="w-14 h-14 rounded-lg border border-[#E5E7EB] overflow-hidden relative">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button"
                onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-bl">×</button>
            </div>
          ))}
          <label className="w-14 h-14 rounded-lg border-2 border-dashed border-[#93C5FD] flex flex-col items-center justify-center cursor-pointer hover:border-[#3B82F6] text-[#6B7280]">
            <span className="text-lg leading-none">+</span>
            <span className="text-[9px]">Ảnh</span>
            <input type="file" accept="image/*,video/*" multiple className="hidden"
              onChange={async (e) => {
                if (!e.target.files?.length) return
                const fileArr = Array.from(e.target.files)
                e.target.value = ''
                const results = await Promise.all(fileArr.map(async (file) => {
                  const fd = new FormData()
                  fd.append('image', file)
                  try {
                    const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
                    const data = await res.json()
                    return (data.url as string) || null
                  } catch { return null }
                }))
                const urls = results.filter((u): u is string => !!u)
                if (urls.length) setPhotos(prev => [...prev, ...urls])
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
          style={{ backgroundColor: '#3B82F6' }}>
          {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
        </button>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-[#6B7280] hover:bg-white">
          Huỷ
        </button>
      </div>
    </div>
  )
}

export default function ReviewContent() {
  const [products, setProducts]     = useState<any[]>([])
  const [reviewed, setReviewed]     = useState<any[]>([])
  const [tab, setTab]               = useState<'pending'|'reviewed'>('pending')
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [filter, setFilter]         = useState('Tất cả')
  const [approving, setApproving]   = useState(false)
  const [toast, setToast]           = useState('')

  // Per-product inputs
  const [specs, setSpecs] = useState<Record<string, Spec>>({})
  const [qtys,  setQtys]  = useState<Record<string, string>>({})
  const [estimatedPrices, setEstimatedPrices] = useState<Record<string, string>>({})
  const [imgErr, setImgErr] = useState<Record<string, boolean>>({})
  const [reviewPhotos, setReviewPhotos] = useState<Record<string, string[]>>({})

  // Reviewed tab state
  const [expandedReviewed, setExpandedReviewed] = useState<string | null>(null)
  const [editingReviewed, setEditingReviewed] = useState<string | null>(null)

  // Excel upload
  const excelRef = useRef<HTMLInputElement>(null)
  const [excelLoading, setExcelLoading] = useState(false)

  // Rejecting
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('/api/review/products')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setProducts(data)
          setReviewed([])
        } else {
          setProducts(data.pending || [])
          setReviewed(data.reviewed || [])
        }
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

  function updateSpec(id: string, field: keyof Spec, value: string) {
    setSpecs(prev => ({ ...prev, [id]: { ...(prev[id] || { weight:'', dimensions:'', material:'', useCases:'' }), [field]: value } }))
  }

  const pfx = todayKey()
  const alreadyApproved = products.filter(p => p.checkCode?.startsWith(pfx)).length
  const selectedArr = [...selected]
  const previewCodes: Record<string, string> = {}
  selectedArr.forEach((id, i) => {
    previewCodes[id] = `${pfx}.${String(alreadyApproved + i + 1).padStart(2, '0')}`
  })

  async function handleApprove() {
    if (selected.size === 0) return
    setApproving(true)
    try {
      const res = await fetch('/api/products/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [...selected],
          specs: Object.fromEntries([...selected].map(id => [id, specs[id] || { weight:'', dimensions:'', material:'', useCases:'' }])),
          qtys: Object.fromEntries([...selected].map(id => [id, qtys[id] || ''])),
          estimatedPrices: Object.fromEntries([...selected].map(id => [id, estimatedPrices[id] || ''])),
          photos: Object.fromEntries([...selected].map(id => [id, reviewPhotos[id] || []])),
        }),
      })
      const data = await res.json()
      const approved = data.approved || []
      showToast(`✅ Đã duyệt ${approved.length} sản phẩm${approved.length ? ` · Mã: ${approved.map((a: any) => a.checkCode).join(', ')}` : ''}`)
      setSelected(new Set())
      setSpecs({})
      setQtys({})
      setEstimatedPrices({})
      setReviewPhotos({})
      await fetchProducts()
    } catch {
      showToast('Lỗi khi duyệt sản phẩm')
    } finally {
      setApproving(false)
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Xác nhận không duyệt sản phẩm này?')) return
    setRejectingId(id)
    try {
      const res = await fetch(`/api/review/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: 'Không duyệt' }),
      })
      if (res.ok) {
        showToast('❌ Đã từ chối sản phẩm')
        setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
        await fetchProducts()
      } else {
        showToast('Lỗi khi từ chối')
      }
    } catch {
      showToast('Lỗi khi từ chối')
    } finally {
      setRejectingId(null)
    }
  }

  const [resetting, setResetting] = useState(false)
  async function handleReset() {
    if (!confirm('Xóa toàn bộ sản phẩm đang chờ duyệt và import lại?')) return
    setResetting(true)
    try {
      await fetch('/api/admin/reset-products', { method: 'DELETE' })
      showToast('🗑️ Đã xóa sản phẩm cũ — hãy vào Import để thêm lại')
      setProducts([])
      setSelected(new Set())
    } finally {
      setResetting(false)
    }
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExcelLoading(true)
    try {
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(new Uint8Array(buf), { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[]
      if (!rows.length) { showToast('File Excel trống'); return }

      const parsed = rows.map((row, i) => ({
        id:          `EXCEL-${Date.now()}-${i}`,
        name:        getCol(row, 'name') || `SP ${i + 1}`,
        imageUrl:    getCol(row, 'imageUrl'),
        category:    getCol(row, 'category') || 'Gia dụng',
        marketPrice: parsePrice(getCol(row, 'price')),
        sales30d:    parseInt(getCol(row, 'salesVolume')) || 0,
        growthRate:  parseFloat(getCol(row, 'growthRate')) || 0,
        kaloUrl:     getCol(row, 'kalodataLink'),
        shopUrl:     getCol(row, 'tiktokLink'),
        description: '',
      })).filter(p => p.name && !p.name.startsWith('SP '))

      if (!parsed.length) { showToast('Không đọc được dữ liệu từ Excel'); return }

      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: parsed }),
      })
      const data = await res.json()
      showToast(`📁 Đã thêm ${data.added || 0} sản phẩm từ Excel vào danh sách duyệt`)
      await fetchProducts()
    } catch (err: any) {
      showToast('Lỗi đọc Excel: ' + err.message)
    } finally {
      setExcelLoading(false)
      e.target.value = ''
    }
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

  const inpCls = 'w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#E05B28] bg-white'

  return (
    <div className="max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg max-w-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">✅ Duyệt hàng</h1>
          <p className="text-[#6B7280] mt-1 text-sm">Chọn sản phẩm · nhập thông số · mã check tự sinh khi duyệt</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <input ref={excelRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
          <button onClick={() => excelRef.current?.click()} disabled={excelLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: '#059669' }}>
            {excelLoading ? '⏳ Đang đọc...' : '📁 Thêm từ Excel'}
          </button>
          <button onClick={handleReset} disabled={resetting}
            className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: '#F3F4F6', color: '#9CA3AF' }}
            title="Xóa sản phẩm đang chờ duyệt để import lại">
            {resetting ? '...' : '🗑️ Reset'}
          </button>
          {selected.size > 0 && (
            <button onClick={handleApprove} disabled={approving}
              className="px-5 py-2 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
              style={{ backgroundColor: '#E05B28' }}>
              {approving ? 'Đang duyệt...' : `✅ Duyệt ${selected.size} SP →`}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('pending')} className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: tab==='pending'?'#E05B28':'#F3F4F6', color: tab==='pending'?'white':'#6B7280' }}>
          Chờ duyệt ({products.length})
        </button>
        <button onClick={() => setTab('reviewed')} className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: tab==='reviewed'?'#E05B28':'#F3F4F6', color: tab==='reviewed'?'white':'#6B7280' }}>
          Đã duyệt ({reviewed.length})
        </button>
      </div>

      {/* ─── Đã duyệt tab ─────────────────────────────────────────────────── */}
      {tab === 'reviewed' && (
        <div>
          {reviewed.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-[#6B7280]">Chưa có sản phẩm nào đã duyệt</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
              {reviewed.map(p => {
                const isExpanded = expandedReviewed === p.id
                const isEditing  = editingReviewed  === p.id
                return (
                  <div key={p.id} className="p-4">
                    <div className="flex gap-4 items-start">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-lg bg-[#F3F4F6] shrink-0 overflow-hidden border border-[#E5E7EB] flex items-center justify-center text-xl">
                        {isUrl(p.imageUrl)
                          ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          : '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-[#111827]">{p.name}</span>
                          <ProductStatusBadge status={p.status} />
                          {p.checkCode && (
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: '#FFF3EE', color: '#E05B28' }}>
                              {p.checkCode}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-[#6B7280] mb-2">
                          {p.marketPrice > 0 && <span>💰 {fmt(p.marketPrice)}</span>}
                          <span>📦 {p.sales30d > 0 ? `${p.sales30d.toLocaleString()} đơn/tháng` : '—'}</span>
                          {p.growthRate > 0
                            ? <span className="text-green-600 font-semibold">+{Number(p.growthRate).toFixed(1)}%</span>
                            : <span className="text-[#9CA3AF]">tăng trưởng —</span>
                          }
                        </div>
                        {/* Spec summary if exists */}
                        {(p.specWeight || p.specDimensions || p.specMaterial || p.specUseCases || p.importQty || p.estimatedImportPrice) && (
                          <div className="flex flex-wrap gap-2 text-xs text-[#6B7280] mb-2">
                            {p.importQty > 0 && <span className="px-2 py-0.5 rounded bg-[#F3F4F6]">📦 {p.importQty} thùng</span>}
                            {p.estimatedImportPrice > 0 && <span className="px-2 py-0.5 rounded bg-[#FFF3EE]" style={{ color: '#E05B28' }}>💰 {fmt(p.estimatedImportPrice)}/chiếc</span>}
                            {p.specWeight && <span className="px-2 py-0.5 rounded bg-[#F3F4F6]">🏋️ {p.specWeight}</span>}
                            {p.specDimensions && <span className="px-2 py-0.5 rounded bg-[#F3F4F6]">📐 {p.specDimensions}</span>}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {getBestShopLink(p) && (
                            <a href={getBestShopLink(p)!} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-bold no-underline"
                              style={{ background: 'linear-gradient(135deg,#EC4899,#DB2777)' }}>
                              🏆 Shop bán chạy
                            </a>
                          )}
                          {getKaloLink(p) && (
                            <a href={getKaloLink(p)!} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold no-underline"
                              style={{ background: '#EEF2FF', color: '#4361EE', border: '1px solid #C7D2FE' }}>
                              🔗 Kalodata
                            </a>
                          )}
                          {/* Detail / Edit buttons */}
                          <button
                            onClick={() => { setExpandedReviewed(isExpanded ? null : p.id); setEditingReviewed(null) }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{ background: isExpanded ? '#DBEAFE' : '#F3F4F6', color: isExpanded ? '#1D4ED8' : '#6B7280' }}>
                            {isExpanded ? '▲ Ẩn bớt' : '▼ Xem chi tiết'}
                          </button>
                          <button
                            onClick={() => { setEditingReviewed(isEditing ? null : p.id); setExpandedReviewed(null) }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{ background: isEditing ? '#DBEAFE' : '#F3F4F6', color: isEditing ? '#1D4ED8' : '#6B7280' }}>
                            ✏️ Sửa thông tin
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expand detail panel */}
                    {isExpanded && (
                      <div className="mt-3 ml-18 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#374151] space-y-1.5">
                        <div className="font-semibold text-[#111827] mb-2">📋 Thông tin chi tiết</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div><span className="text-[#6B7280]">Mã check:</span> <span className="font-mono font-bold" style={{ color: '#E05B28' }}>{p.checkCode || '—'}</span></div>
                          <div><span className="text-[#6B7280]">SL nhập:</span> {p.importQty > 0 ? `${p.importQty} thùng` : '—'}</div>
                          <div><span className="text-[#6B7280]">Giá nhập DK:</span> {p.estimatedImportPrice > 0 ? fmt(p.estimatedImportPrice) + '/chiếc' : '—'}</div>
                          <div><span className="text-[#6B7280]">DS 30 ngày:</span> {p.sales30d > 0 ? p.sales30d.toLocaleString() + ' đơn' : '—'}</div>
                          <div><span className="text-[#6B7280]">Tốc độ tăng:</span> {p.growthRate > 0 ? `+${Number(p.growthRate).toFixed(1)}%` : '—'}</div>
                          <div><span className="text-[#6B7280]">Danh mục:</span> {p.category || '—'}</div>
                          <div><span className="text-[#6B7280]">Cân nặng:</span> {p.specWeight || '—'}</div>
                          <div><span className="text-[#6B7280]">Kích thước:</span> {p.specDimensions || '—'}</div>
                          <div><span className="text-[#6B7280]">Chất liệu:</span> {p.specMaterial || '—'}</div>
                          <div><span className="text-[#6B7280]">Công dụng:</span> {p.specUseCases || '—'}</div>
                        </div>
                        {p.photos?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {p.photos.map((url: string, i: number) => (
                              <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E5E7EB]" />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Edit panel */}
                    {isEditing && (
                      <ReviewedEditPanel
                        p={p}
                        onClose={() => setEditingReviewed(null)}
                        onSaved={() => { fetchProducts(); showToast('✅ Đã cập nhật thông tin') }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Chờ duyệt tab ────────────────────────────────────────────────── */}
      {tab === 'pending' && (
        <>
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-5">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{ backgroundColor: filter === cat ? '#E05B28' : '#F3F4F6', color: filter === cat ? 'white' : '#6B7280' }}>
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-[#6B7280]">Không có sản phẩm cần duyệt</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Dùng nút "Thêm từ Excel" hoặc import từ Kalodata</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB]">
              {/* Toolbar */}
              <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-3">
                <button onClick={toggleAll} className="text-sm text-[#E05B28] hover:underline font-medium">
                  {selected.size === filtered.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
                <span className="text-[#6B7280] text-sm">{filtered.length} sản phẩm</span>
                {selected.size > 0 && (
                  <span className="text-xs text-[#E05B28] font-semibold bg-orange-50 px-2 py-0.5 rounded-full">
                    Đã chọn: {selected.size}
                  </span>
                )}
              </div>

              <div className="divide-y divide-[#F3F4F6]">
                {filtered.map(p => {
                  const isSel = selected.has(p.id)
                  const spec  = specs[p.id] || { weight:'', dimensions:'', material:'', useCases:'' }

                  return (
                    <div key={p.id} className={`p-5 transition-colors ${isSel ? 'bg-orange-50' : ''}`}>
                      {/* Main row */}
                      <div className="flex gap-4">
                        <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)}
                          className="mt-1 w-4 h-4 accent-[#E05B28] shrink-0" />

                        <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-2xl shrink-0 overflow-hidden border border-[#E5E7EB]">
                          {isUrl(p.imageUrl) && !imgErr[p.id]
                            ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover"
                                onError={() => setImgErr(prev => ({ ...prev, [p.id]: true }))} />
                            : <span>📦</span>
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-semibold text-[#111827] leading-tight">{p.name}</h3>
                            <ProductStatusBadge status={p.status} />
                            {p.checkCode && (
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                                style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                                🏷️ {p.checkCode}
                              </span>
                            )}
                          </div>

                          {/* Stats — always visible */}
                          <div className="flex flex-wrap gap-3 text-xs mb-2">
                            <span className="text-[#6B7280]">💰 {fmt(p.marketPrice)}</span>
                            <span className="text-[#374151] font-medium">
                              📦 {p.sales30d > 0 ? <><b>{fmtNum(p.sales30d)}</b> đơn/30 ngày</> : <span className="text-[#9CA3AF]">DS 30 ngày —</span>}
                            </span>
                            {p.growthRate > 0
                              ? <span className="text-green-600 font-semibold">+{Number(p.growthRate).toFixed(1)}%</span>
                              : <span className="text-[#9CA3AF]">tăng trưởng —</span>
                            }
                            {p.category && (
                              <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
                                {p.category}
                              </span>
                            )}
                          </div>

                          {p.sellerCount > 0 && (
                            <div className="flex gap-3 text-xs mb-1">
                              <span className="text-[#6B7280]">🏪 <b>{fmtNum(p.sellerCount)}</b> shop đang bán</span>
                            </div>
                          )}

                          {/* Links + Không duyệt */}
                          <div className="flex flex-wrap gap-2 mt-1 items-center">
                            {getBestShopLink(p) && (
                              <a href={getBestShopLink(p)!} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-white text-xs font-bold no-underline"
                                style={{ background: 'linear-gradient(135deg,#EC4899,#DB2777)', boxShadow: '0 2px 6px #EC489933' }}>
                                🏆 Shop bán chạy
                              </a>
                            )}
                            {getKaloLink(p) && (
                              <a href={getKaloLink(p)!} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold no-underline"
                                style={{ background: '#EEF2FF', color: '#4361EE', border: '1px solid #C7D2FE' }}>
                                🔗 Kalodata
                              </a>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); handleReject(p.id) }}
                              disabled={rejectingId === p.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                              style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
                              {rejectingId === p.id ? '...' : '❌ Không duyệt'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Spec + qty panel — shown when selected */}
                      {isSel && (
                        <div className="mt-4 ml-8 p-4 rounded-xl border border-orange-200 bg-[#FFFBEB]">
                          {/* Check code preview */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-[#92400E]">🏷️ Mã check sẽ là:</span>
                            <span className="text-xs font-mono font-bold text-[#D97706] bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300">
                              {previewCodes[p.id] || `${pfx}.??`}
                            </span>
                          </div>

                          {/* SL nhập + Giá dự kiến */}
                          <div className="flex gap-4 mb-3">
                            <div>
                              <label className="text-xs text-[#6B7280] font-semibold mb-1 block">📦 SL nhập (thùng)</label>
                              <input type="number" min="0" value={qtys[p.id] || ''}
                                onChange={e => setQtys(prev => ({ ...prev, [p.id]: e.target.value }))}
                                placeholder="VD: 500" className={inpCls + ' w-28'} />
                            </div>
                            <div>
                              <label className="text-xs text-[#6B7280] font-semibold mb-1 block">💰 Giá nhập dự kiến (đ/chiếc)</label>
                              <input type="number" min="0" value={estimatedPrices[p.id] || ''}
                                onChange={e => setEstimatedPrices(prev => ({ ...prev, [p.id]: e.target.value }))}
                                placeholder="VD: 45000" className={inpCls + ' w-36'} />
                            </div>
                          </div>

                          {/* Specs 2x2 */}
                          <div className="text-xs font-semibold text-[#D97706] mb-2">📋 Thông số kỹ thuật</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-[#6B7280] mb-1 block">🏋️ Cân nặng</label>
                              <input value={spec.weight} onChange={e => updateSpec(p.id, 'weight', e.target.value)}
                                placeholder="VD: 350g/hộp" className={inpCls} />
                            </div>
                            <div>
                              <label className="text-xs text-[#6B7280] mb-1 block">📐 Kích thước</label>
                              <input value={spec.dimensions} onChange={e => updateSpec(p.id, 'dimensions', e.target.value)}
                                placeholder="VD: 20×15×5cm" className={inpCls} />
                            </div>
                            <div>
                              <label className="text-xs text-[#6B7280] mb-1 block">🧵 Chất liệu</label>
                              <input value={spec.material} onChange={e => updateSpec(p.id, 'material', e.target.value)}
                                placeholder="VD: Nhựa ABS cao cấp" className={inpCls} />
                            </div>
                            <div>
                              <label className="text-xs text-[#6B7280] mb-1 block">✅ Công dụng</label>
                              <input value={spec.useCases} onChange={e => updateSpec(p.id, 'useCases', e.target.value)}
                                placeholder="VD: Dùng trong bếp" className={inpCls} />
                            </div>
                          </div>

                          {/* Photo upload */}
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-[#D97706] mb-2">🖼️ Ảnh sản phẩm</div>
                            <div className="flex flex-wrap gap-2">
                              {(reviewPhotos[p.id] || []).map((url: string, i: number) => (
                                <div key={i} className="w-14 h-14 rounded-lg border border-[#E5E7EB] overflow-hidden relative">
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                  <button type="button"
                                    onClick={() => setReviewPhotos(prev => ({ ...prev, [p.id]: (prev[p.id] || []).filter((_: string, j: number) => j !== i) }))}
                                    className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-bl">×</button>
                                </div>
                              ))}
                              <label className="w-14 h-14 rounded-lg border-2 border-dashed border-[#E5E7EB] flex flex-col items-center justify-center cursor-pointer hover:border-[#E05B28] text-[#6B7280]">
                                <span className="text-lg leading-none">+</span>
                                <span className="text-[9px]">Ảnh/Video</span>
                                <input type="file" accept="image/*,video/*" multiple className="hidden"
                                  onChange={async (e) => {
                                    if (!e.target.files?.length) return
                                    const fileArr = Array.from(e.target.files)
                                    e.target.value = ''
                                    const productId = p.id
                                    const results = await Promise.all(fileArr.map(async (file) => {
                                      const fd = new FormData()
                                      fd.append('image', file)
                                      try {
                                        const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
                                        const data = await res.json()
                                        return (data.url as string) || null
                                      } catch { return null }
                                    }))
                                    const urls = results.filter((u): u is string => !!u)
                                    if (urls.length) setReviewPhotos(prev => ({ ...prev, [productId]: [...(prev[productId] || []), ...urls] }))
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Sticky approve bar */}
              {selected.size > 0 && (
                <div className="sticky bottom-0 px-5 py-4 border-t border-orange-200 bg-[#FFFBEB] rounded-b-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">
                      Đã chọn <span className="font-bold text-[#E05B28]">{selected.size}</span> / {filtered.length} sản phẩm
                    </span>
                    <button onClick={handleApprove} disabled={approving}
                      className="px-6 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60 transition-opacity"
                      style={{ backgroundColor: '#E05B28', boxShadow: '0 4px 14px #E05B2833' }}>
                      {approving ? '⏳ Đang duyệt...' : `✅ Chốt & gửi XNK →`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
