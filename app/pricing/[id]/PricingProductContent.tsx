'use client'

import { useEffect, useState, useRef, Component } from 'react'
import { useRouter } from 'next/navigation'
import { calculateLandedCost } from '@/lib/calc'
import ChatBox from '@/components/ui/ChatBox'

class SafeBox extends Component<{ children: React.ReactNode }, { err: string | null }> {
  constructor(props: any) { super(props); this.state = { err: null } }
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  render() {
    if (this.state.err) return (
      <div className="text-xs text-red-500 bg-red-50 rounded p-2">Lỗi: {this.state.err}</div>
    )
    return this.props.children
  }
}

function fmtNum(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function fmt(n: number) { return fmtNum(n) + 'đ' }
function isUrl(s?: string): boolean { return !!s && (s.startsWith('http://') || s.startsWith('https://')) }
function calcImportRange(marketPrice: number) {
  if (!marketPrice || marketPrice <= 0) return null
  const min = Math.round((marketPrice * 0.45) * 0.83 / 1.08)
  const max = Math.round((marketPrice * 0.60) * 0.83 / 1.08)
  return { min, max }
}

interface PricingProductContentProps {
  productId: string
  currentUser: { id: string; name: string; role: string }
}

export default function PricingProductContent({ productId, currentUser }: PricingProductContentProps) {
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [freightType, setFreightType] = useState<'nguyen_xe' | 'ghep_xe'>('nguyen_xe')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const videoUrlRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  useEffect(() => {
    fetch(`/api/pricing/products/${productId}`)
      .then(r => {
        if (r.status === 404 || r.status === 403) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (data) setProduct(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [productId])

  function updateForm(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function getCalc() {
    const f = form
    if (!f.factoryCny || !f.volumeM3 || !f.qtyPerBox || !product?.dailyRate) return null
    try {
      return calculateLandedCost(
        {
          factoryCny: Number(f.factoryCny),
          weightKg: Number(f.weightKg || 0),
          volumeM3: Number(f.volumeM3 || 0),
          domesticFreightCny: Number(f.domesticFreightCny || 0),
          inspectionVnd: Number(f.inspectionVnd || 0),
          quarantineCny: Number(f.quarantineCny || 0),
          qtyPerBox: Number(f.qtyPerBox),
        },
        {
          fxRate: Number(product.dailyRate.fxRate),
          intlFreightPerKg: Number(product.dailyRate.intlFreightPerKg || 0),
          intlFreightNguyenXe: product.dailyRate.intlFreightNguyenXe,
          intlFreightGhepXe: product.dailyRate.intlFreightGhepXe,
          exportTaxPct: Number(product.exportTaxPct || 0),
          importTaxPct: Number(product.importTaxPct || 0),
        },
        freightType
      )
    } catch { return null }
  }

  const MAX_FILES = 10

  async function uploadMedia(fileArr: File[]) {
    if (!fileArr.length) return
    const currentCount = photos.length
    if (currentCount + fileArr.length > MAX_FILES) {
      showToast(`Tối đa ${MAX_FILES} file. Còn thêm được ${MAX_FILES - currentCount} file.`)
      fileArr = fileArr.slice(0, MAX_FILES - currentCount)
      if (!fileArr.length) return
    }
    setUploading(true)
    try {
      const results = await Promise.all(
        fileArr.map(async file => {
          const fd = new FormData()
          fd.append('image', file)
          try {
            const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
            const data = await res.json()
            if (data.error === 'VIDEO_NO_STORAGE') {
              showToast('📎 Video: Vui lòng dán link video vào ô "URL video" bên dưới.')
              videoUrlRef.current?.focus()
              return { url: null, error: data.message }
            }
            if (!res.ok || data.error) return { url: null, error: data.error || 'Lỗi upload' }
            return { url: data.url as string, error: null }
          } catch {
            return { url: null, error: 'Lỗi kết nối' }
          }
        })
      )
      const uploadedUrls = results.filter(r => r.url).map(r => r.url as string)
      if (uploadedUrls.length === 0) return
      if (results.some(r => r.error && r.error !== 'VIDEO_NO_STORAGE')) {
        showToast(`Tải được ${uploadedUrls.length}/${fileArr.length} file.`)
      }
      setPhotos(prev => [...prev, ...uploadedUrls])
      await Promise.all(
        uploadedUrls.map(url =>
          fetch(`/api/products/${productId}/photos`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          })
        )
      )
    } catch {
      showToast('Lỗi kết nối khi tải file')
    } finally {
      setUploading(false)
    }
  }

  async function submitPricing() {
    const f = form
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${productId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, freightType, photos }),
      })
      if (res.ok) {
        showToast('✅ Đã gửi báo giá thành công!')
        setTimeout(() => router.push('/pricing'), 1500)
      } else {
        showToast('Lỗi khi gửi báo giá')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] h-16" />)}
        </div>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-[#6B7280] mb-4">Không tìm thấy sản phẩm hoặc bạn chưa được phân công.</p>
        <a href="/pricing" className="text-sm font-semibold underline" style={{ color: '#E05B28' }}>← Quay lại danh sách</a>
      </div>
    )
  }

  const calc = getCalc()
  const dr = product.dailyRate
  const importRange = calcImportRange(product.marketPrice)

  return (
    <div className="max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg max-w-xs">
          {toast}
        </div>
      )}

      <a href="/pricing" className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#E05B28] mb-4">
        ← Danh sách sản phẩm
      </a>

      <div className="flex items-start gap-3 mb-5">
        <span className="px-2 py-0.5 text-xs font-mono rounded font-semibold shrink-0 mt-1" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
          {product.checkCode}
        </span>
        <h1 className="text-xl font-bold text-[#111827] leading-snug">{product.name}</h1>
      </div>

      <div className="space-y-5">
        {/* Product info */}
        <div className="flex gap-3 p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
          {isUrl(product.imageUrl) && (
            <img src={product.imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg border border-[#E5E7EB] shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-3 text-xs text-[#6B7280] mb-2">
              {product.marketPrice > 0 && <span>💰 Giá TT: <strong className="text-[#111827]">{fmt(product.marketPrice)}</strong></span>}
              {(product.sales30d || 0) > 0 && <span>📦 <strong className="text-[#111827]">{(product.sales30d || 0).toLocaleString()}</strong> đơn/30 ngày</span>}
              {(product.growthRate || 0) > 0 && <span className="text-green-600 font-semibold">+{Number(product.growthRate).toFixed(1)}%</span>}
              {product.category && <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>{product.category}</span>}
            </div>
            {importRange && (
              <div className="mb-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                💡 <strong>Giá nhập dự kiến:</strong> <span className="text-blue-700 font-semibold">{fmt(importRange.min)}</span> – <span className="text-blue-700 font-semibold">{fmt(importRange.max)}</span>
                <span className="text-[#6B7280] ml-1">(45–60% giá TT × 0.83/1.08)</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs mb-2">
              <span className={product.specWeight ? 'text-[#374151]' : 'text-[#9CA3AF]'}>🏋️ {product.specWeight || 'Chưa nhập cân nặng'}</span>
              <span className={product.specDimensions ? 'text-[#374151]' : 'text-[#9CA3AF]'}>📐 {product.specDimensions || 'Chưa nhập kích thước'}</span>
              <span className={product.specMaterial ? 'text-[#374151]' : 'text-[#9CA3AF]'}>🧵 {product.specMaterial || 'Chưa nhập chất liệu'}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isUrl(product.shopUrl) && (
                <a href={product.shopUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-bold no-underline"
                  style={{ background: 'linear-gradient(135deg,#EC4899,#DB2777)' }}>🏆 Shop bán chạy</a>
              )}
              {isUrl(product.kaloUrl) && (
                <a href={product.kaloUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold no-underline"
                  style={{ background: '#EEF2FF', color: '#4361EE', border: '1px solid #C7D2FE' }}>🔗 Kalodata</a>
              )}
            </div>
          </div>
        </div>

        {dr && (
          <div className="bg-[#F9FAFB] rounded-lg px-4 py-3 flex flex-wrap gap-4 text-xs text-[#6B7280]">
            <span>💱 Tỷ giá: <strong className="text-[#111827]">{fmtNum(dr.fxRate)} VND/CNY</strong></span>
            {dr.intlFreightNguyenXe != null && (
              <span>🚛 Nguyên Xe: <strong className="text-[#111827]">{fmtNum(dr.intlFreightNguyenXe)}đ/m³</strong></span>
            )}
            {dr.intlFreightGhepXe != null && (
              <span>📦 Ghép Xe: <strong className="text-[#111827]">{fmtNum(dr.intlFreightGhepXe)}đ/m³</strong></span>
            )}
          </div>
        )}

        {dr && (dr.intlFreightNguyenXe != null || dr.intlFreightGhepXe != null) && (
          <div>
            <label className="text-xs font-medium text-[#6B7280] mb-2 block">Loại vận chuyển quốc tế</label>
            <div className="flex gap-2">
              {[
                { value: 'nguyen_xe', label: '🚛 Nguyên Xe', rate: dr.intlFreightNguyenXe },
                { value: 'ghep_xe', label: '📦 Ghép Xe', rate: dr.intlFreightGhepXe },
              ].map(opt => (
                <button type="button" key={opt.value}
                  onClick={() => setFreightType(opt.value as any)}
                  className="flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: freightType === opt.value ? '#E05B28' : '#F3F4F6',
                    color: freightType === opt.value ? 'white' : '#6B7280',
                    borderColor: freightType === opt.value ? '#E05B28' : '#E5E7EB',
                  }}>
                  {opt.label}
                  {opt.rate != null && <span className="ml-1 text-xs opacity-75">({fmtNum(opt.rate)}đ/m³)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <h4 className="text-sm font-semibold text-[#111827] mb-3">Thông tin giá</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'factoryCny', label: 'Giá xuất xưởng (tệ/chiếc)', type: 'number' },
              { key: 'weightKg', label: 'Cân nặng (kg/chiếc)', type: 'number' },
              { key: 'volumeM3', label: 'Số khối/chiếc (m³)', type: 'number' },
              { key: 'domesticFreightCny', label: 'Cước nội địa TQ (tệ/chiếc)', type: 'number' },
              { key: 'inspectionVnd', label: 'Phí kiểm định (VND/chiếc)', type: 'number' },
              { key: 'quarantineCny', label: 'Phí kiểm dịch (tệ/chiếc)', type: 'number' },
              { key: 'qtyPerBox', label: 'Số lượng/thùng', type: 'number' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-[#6B7280] mb-1 block">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key] || ''}
                  onChange={e => updateForm(field.key, e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]"
                />
              </div>
            ))}
          </div>
        </div>

        {calc && (
          <div className="bg-[#FFF3EE] rounded-xl p-4">
            <h4 className="text-sm font-semibold text-[#E05B28] mb-3">Kết quả tính toán</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between"><span className="text-[#6B7280]">Giá xuất xưởng VND</span><span>{fmt(calc.breakdown.factoryVND)}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Thuế xuất khẩu</span><span>{fmt(calc.breakdown.exportTaxAmt)}</span></div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Cước QT {freightType === 'nguyen_xe' ? '(Nguyên Xe)' : '(Ghép Xe)'}</span>
                <span>{fmt(calc.breakdown.intlFreightAmt)}</span>
              </div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Thuế nhập khẩu</span><span>{fmt(calc.breakdown.importTaxAmt)}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">Cước nội địa</span><span>{fmt(calc.breakdown.domesticVND)}</span></div>
              {calc.breakdown.inspectionVND > 0 && (
                <div className="flex justify-between"><span className="text-[#6B7280]">Phí kiểm định</span><span>{fmt(calc.breakdown.inspectionVND)}</span></div>
              )}
              {calc.breakdown.quarantineVND > 0 && (
                <div className="flex justify-between"><span className="text-[#6B7280]">Phí kiểm dịch</span><span>{fmt(calc.breakdown.quarantineVND)}</span></div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-orange-200 flex justify-between font-bold text-sm">
              <span className="text-[#E05B28]">TỔNG/chiếc</span>
              <span className="text-[#E05B28]">{fmt(calc.totalPerUnit)}</span>
            </div>
            <div className="flex justify-between font-semibold text-sm mt-1">
              <span className="text-[#111827]">TỔNG/thùng ({form.qtyPerBox} cái)</span>
              <span className="text-[#111827]">{fmt(calc.totalPerBox)}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <h4 className="text-sm font-semibold text-[#111827] mb-3">Thông tin nhà cung cấp</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'supplierName', label: 'Tên NCC', type: 'text' },
              { key: 'supplierContact', label: 'Liên hệ', type: 'text' },
              { key: 'moq', label: 'MOQ', type: 'text' },
              { key: 'leadTime', label: 'Lead time', type: 'text' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-[#6B7280] mb-1 block">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key] || ''}
                  onChange={e => updateForm(field.key, e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-[#6B7280] mb-1 block">Ghi chú báo giá</label>
            <textarea rows={2} value={form.pricingNotes || ''}
              onChange={e => updateForm('pricingNotes', e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none" />
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-[#6B7280] mb-1 block">URL video (TikTok / YouTube...)</label>
            <input ref={videoUrlRef} type="text" value={form.videoUrl || ''}
              onChange={e => updateForm('videoUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-[#111827]">🖼️ Ảnh sản phẩm</h4>
            <span className="text-xs text-[#9CA3AF]">{photos.length}/{MAX_FILES}</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {photos.map((url, i) => (
              <div key={i} className="w-16 h-16 rounded-lg border border-[#E5E7EB] overflow-hidden bg-[#F9FAFB]">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {photos.length < MAX_FILES && (
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[#E5E7EB] flex flex-col items-center justify-center cursor-pointer hover:border-[#E05B28] text-[#6B7280] gap-0.5"
                title="Thêm ảnh">
                <span className="text-lg leading-none">🖼</span>
                <span className="text-[9px]">Ảnh</span>
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
                  onChange={e => {
                    if (e.target.files?.length) {
                      const arr = Array.from(e.target.files); e.target.value = ''; uploadMedia(arr)
                    }
                  }} />
              </label>
            )}
          </div>
          {uploading && <p className="text-xs text-[#E05B28] animate-pulse">⏳ Đang tải lên...</p>}
        </div>

        <SafeBox>
          <ChatBox productId={productId} currentUser={currentUser} />
        </SafeBox>

        <button type="button"
          onClick={submitPricing}
          disabled={saving || !form.factoryCny || !form.volumeM3 || !form.qtyPerBox}
          className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
          style={{ backgroundColor: '#E05B28' }}>
          {saving ? 'Đang gửi...' : '📤 Gửi báo giá'}
        </button>
      </div>
    </div>
  )
}
