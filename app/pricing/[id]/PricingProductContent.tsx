'use client'

import { useEffect, useState, Component } from 'react'
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

interface DailyRate {
  fxRate: number
  intlFreightPerKg: number
  intlFreightNguyenXe?: number
  intlFreightGhepXe?: number
}

interface Product {
  id: string
  name: string
  checkCode: string
  marketPrice: number
  growthRate?: number
  sales30d?: number
  category?: string
  imageUrl?: string
  kaloUrl?: string
  shopUrl?: string
  specWeight?: string
  specDimensions?: string
  specMaterial?: string
  specUseCases?: string
  buyerRequestNotes?: string
  dailyRate?: DailyRate
  exportTaxPct?: number
  importTaxPct?: number
  estimatedImportPrice?: number
  importQty?: number
  photos?: string[]
}

function fmt(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
}
function fmtNum(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function fmtInput(v: string | number): string {
  const digits = String(v ?? '').replace(/\D/g, '')
  if (!digits || digits === '0') return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function stripDots(s: string): string { return s.replace(/\./g, '') }
function isUrl(s?: string) { return !!s && (s.startsWith('http://') || s.startsWith('https://')) }
function getShopLink(p: Product): string | null {
  if (isUrl(p.shopUrl)) return p.shopUrl!
  if (p.name) return `https://www.tiktok.com/search?q=${encodeURIComponent(p.name)}&type=item`
  return null
}
function getKaloLink(p: Product): string | null {
  if (isUrl(p.kaloUrl)) return p.kaloUrl!
  if (p.name) return `https://kalodata.com/vn/product/search?keyword=${encodeURIComponent(p.name)}&region=VN`
  return null
}
function calcImportRange(marketPrice: number) {
  const min = Math.round((marketPrice * 0.45) * 0.83 / 1.08)
  const max = Math.round((marketPrice * 0.60) * 0.83 / 1.08)
  return { min, max }
}

const MAX_PHOTOS = 10
const MAX_VIDEOS = 5

interface Props {
  productId: string
  currentUser: { id: string; name: string; role: string }
}

export default function PricingProductContent({ productId, currentUser }: Props) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [form, setForm] = useState<Record<string, any>>({})
  const [freightType, setFreightType] = useState<'nguyen_xe' | 'ghep_xe'>('nguyen_xe')
  const [photos, setPhotos] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  useEffect(() => {
    fetch(`/api/pricing/products/${productId}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (data) { setProduct(data); setLoading(false) }
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [productId])

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function getCalc() {
    if (!product?.dailyRate || !form.factoryCny || !form.volumeM3PerBox || !form.qtyPerBox) return null
    const qty = Number(form.qtyPerBox)
    if (!qty) return null
    try {
      return calculateLandedCost(
        {
          factoryCny: Number(form.factoryCny),
          weightKg: Number(form.weightKgPerBox || 0) / qty,
          volumeM3: Number(form.volumeM3PerBox || 0) / qty,
          domesticFreightCny: Number(form.domesticFreightCny || 0),
          inspectionVnd: Number(form.inspectionVnd || 0),
          quarantineCny: Number(form.quarantineCny || 0),
          qtyPerBox: qty,
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

  async function uploadMedia(fileArr: File[]) {
    const photoFiles = fileArr.filter(f => f.type.startsWith('image/'))
    const videoFiles = fileArr.filter(f => f.type.startsWith('video/'))

    const availPhotos = MAX_PHOTOS - photos.length
    const availVideos = MAX_VIDEOS - videos.length

    const photosToUpload = photoFiles.slice(0, availPhotos)
    const videosToUpload = videoFiles.slice(0, availVideos)

    if (photoFiles.length > availPhotos) showToast(`Chỉ còn ${availPhotos} chỗ ảnh. Đã bỏ qua ${photoFiles.length - availPhotos} ảnh.`)
    if (videoFiles.length > availVideos) showToast(`Chỉ còn ${availVideos} chỗ video. Đã bỏ qua ${videoFiles.length - availVideos} video.`)

    const allToUpload = [...photosToUpload, ...videosToUpload]
    if (!allToUpload.length) return

    setUploading(true)
    try {
      const results = await Promise.all(allToUpload.map(async file => {
        const fd = new FormData()
        fd.append('image', file)
        try {
          const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
          const data = await res.json()
          if (data.error === 'VIDEO_NO_STORAGE') {
            showToast('Video quá lớn — cần cấu hình Vercel Blob để lưu video.')
            return null
          }
          if (!res.ok || data.error) { showToast(data.error || 'Lỗi upload'); return null }
          return { url: data.url as string, isVideo: file.type.startsWith('video/') }
        } catch { showToast('Lỗi kết nối'); return null }
      }))
      const uploaded = results.filter(Boolean) as { url: string; isVideo: boolean }[]
      const newPhotos = uploaded.filter(r => !r.isVideo).map(r => r.url)
      const newVideos = uploaded.filter(r => r.isVideo).map(r => r.url)
      if (newPhotos.length) {
        setPhotos(prev => [...prev, ...newPhotos])
        await Promise.all(newPhotos.map(url =>
          fetch(`/api/products/${productId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          })
        ))
      }
      if (newVideos.length) setVideos(prev => [...prev, ...newVideos])
    } finally { setUploading(false) }
  }

  async function submit() {
    if (!product || !form.factoryCny || !form.volumeM3PerBox || !form.qtyPerBox) return
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${productId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          freightType,
          photos,
          videos,
        }),
      })
      if (!res.ok) { showToast('Lỗi khi gửi báo giá'); setSaving(false); return }
      showToast('✅ Đã gửi báo giá!')
      setTimeout(() => router.push('/pricing'), 1500)
    } catch { showToast('Lỗi kết nối'); setSaving(false) }
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-[#F3F4F6] rounded w-1/2" />
        <div className="h-40 bg-white rounded-xl border border-[#E5E7EB]" />
        <div className="h-60 bg-white rounded-xl border border-[#E5E7EB]" />
      </div>
    </div>
  )

  if (notFound || !product) return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="text-4xl mb-3">🚫</div>
      <p className="text-[#6B7280] mb-4">Không tìm thấy sản phẩm hoặc bạn không được phân công</p>
      <a href="/pricing" className="text-[#E05B28] font-semibold no-underline">← Quay lại</a>
    </div>
  )

  const calc = getCalc()
  const dr = product.dailyRate
  const importRange = product.marketPrice > 0 ? calcImportRange(product.marketPrice) : null
  const canSubmit = !saving && !!form.factoryCny && !!form.volumeM3PerBox && !!form.qtyPerBox

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg max-w-xs">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <a href="/pricing" className="text-sm text-[#6B7280] hover:text-[#E05B28] no-underline">← Danh sách check giá</a>
        <div className="flex items-center gap-3 mt-2">
          <span className="px-2 py-0.5 text-xs font-mono rounded font-semibold" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
            {product.checkCode}
          </span>
          <h1 className="text-xl font-bold text-[#111827]">{product.name}</h1>
        </div>
        {product.category && <p className="text-sm text-[#6B7280] mt-1">{product.category}</p>}
      </div>

      <div className="space-y-4">
        {/* Product info card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex gap-3">
            {product.imageUrl && (
              <img src={product.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-3 text-xs text-[#6B7280] mb-2">
                {product.marketPrice > 0 && <span>💰 Giá TT: <strong className="text-[#111827]">{fmt(product.marketPrice)}</strong></span>}
                {(product.sales30d || 0) > 0 && <span>📦 {(product.sales30d || 0).toLocaleString()} đơn/tháng</span>}
                {(product.growthRate || 0) > 0 && <span className="text-green-600">+{Number(product.growthRate).toFixed(1)}%</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs mb-2">
                <span className={product.specWeight ? 'text-[#374151]' : 'text-[#9CA3AF]'}>
                  🏋️ {product.specWeight || 'Chưa nhập cân nặng'}
                </span>
                <span className={product.specDimensions ? 'text-[#374151]' : 'text-[#9CA3AF]'}>
                  📐 {product.specDimensions || 'Chưa nhập kích thước'}
                </span>
                <span className={product.specMaterial ? 'text-[#374151]' : 'text-[#9CA3AF]'}>
                  🧵 {product.specMaterial || 'Chưa nhập chất liệu'}
                </span>
                {product.specUseCases && <span className="text-[#374151] col-span-2">✅ {product.specUseCases}</span>}
              </div>
              {/* Review info: SL nhập + Giá nhập dự kiến */}
              {(product.importQty || product.estimatedImportPrice) && (
                <div className="flex flex-wrap gap-3 text-xs mb-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  {product.importQty ? (
                    <span className="text-[#15803D]">📦 SL nhập: <strong>{product.importQty} thùng</strong></span>
                  ) : null}
                  {product.estimatedImportPrice ? (
                    <span className="text-[#15803D]">💰 Giá dự kiến: <strong>{fmt(product.estimatedImportPrice)}/chiếc</strong></span>
                  ) : null}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {getShopLink(product) && (
                  <a href={getShopLink(product)!} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-bold no-underline"
                    style={{ background: 'linear-gradient(135deg,#EC4899,#DB2777)' }}>
                    🏆 Shop bán chạy
                  </a>
                )}
                {getKaloLink(product) && (
                  <a href={getKaloLink(product)!} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold no-underline"
                    style={{ background: '#EEF2FF', color: '#4361EE', border: '1px solid #C7D2FE' }}>
                    🔗 Kalodata
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Review photos */}
          {product.photos && product.photos.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-[#6B7280] mb-2">🖼️ Ảnh sản phẩm</div>
              <div className="flex flex-wrap gap-2">
                {product.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#E5E7EB] hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Import range hint */}
          {importRange && (
            <div className="mt-3 rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              💡 <strong>Giá nhập dự kiến:</strong>{' '}
              <span style={{ color: '#1D4ED8' }}>
                {fmt(importRange.min)} – {fmt(importRange.max)}
              </span>
              <span className="text-xs text-[#6B7280] ml-1">(45–60% giá TT × 0.83/1.08)</span>
            </div>
          )}

          {/* Buyer request notes */}
          {product.buyerRequestNotes && (
            <div className="mt-3 rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <span className="font-semibold text-amber-700">📝 Ghi chú từ Admin:</span>
              <p className="mt-1 text-amber-900 text-xs">{product.buyerRequestNotes}</p>
            </div>
          )}
        </div>

        {/* Daily rate info */}
        {dr && (
          <div className="bg-[#F9FAFB] rounded-xl px-4 py-3 flex flex-wrap gap-4 text-xs text-[#6B7280]">
            <span>💱 Tỷ giá: <strong className="text-[#111827]">{fmtNum(dr.fxRate)} VND/CNY</strong></span>
            {dr.intlFreightNguyenXe != null && (
              <span>🚛 Nguyên Xe: <strong className="text-[#111827]">{fmtNum(dr.intlFreightNguyenXe)}đ/m³</strong></span>
            )}
            {dr.intlFreightGhepXe != null && (
              <span>📦 Ghép Xe: <strong className="text-[#111827]">{fmtNum(dr.intlFreightGhepXe)}đ/m³</strong></span>
            )}
            <span>Thuế xuất: <strong className="text-[#111827]">{product.exportTaxPct || 0}%</strong></span>
            <span>Thuế nhập: <strong className="text-[#111827]">{product.importTaxPct || 0}%</strong></span>
          </div>
        )}

        {/* Freight type */}
        {dr && (dr.intlFreightNguyenXe != null || dr.intlFreightGhepXe != null) && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <label className="text-xs font-medium text-[#6B7280] mb-2 block">Loại vận chuyển quốc tế</label>
            <div className="flex gap-2">
              {[
                { value: 'nguyen_xe', label: '🚛 Nguyên Xe', rate: dr.intlFreightNguyenXe },
                { value: 'ghep_xe', label: '📦 Ghép Xe', rate: dr.intlFreightGhepXe },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFreightType(opt.value as any)}
                  className="flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: freightType === opt.value ? '#E05B28' : '#F3F4F6',
                    color: freightType === opt.value ? 'white' : '#6B7280',
                    borderColor: freightType === opt.value ? '#E05B28' : '#E5E7EB',
                  }}
                >
                  {opt.label}
                  {opt.rate != null && <span className="ml-1 text-xs opacity-75">({fmtNum(opt.rate)}đ/m³)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pricing inputs */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <h3 className="text-sm font-semibold text-[#111827] mb-3">Thông tin giá</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'factoryCny', label: 'Giá xuất xưởng (CNY/chiếc)', required: true },
              { key: 'qtyPerBox', label: 'Số lượng/thùng (chiếc)', required: true },
              { key: 'weightKgPerBox', label: 'Cân nặng/thùng (kg)' },
              { key: 'volumeM3PerBox', label: 'Số khối/thùng (m³)', required: true },
              { key: 'domesticFreightCny', label: 'Cước nội địa TQ (CNY/chiếc)' },
              { key: 'inspectionVnd', label: 'Phí kiểm định (VND/chiếc)', vnd: true },
              { key: 'quarantineCny', label: 'Phí kiểm dịch (tệ/chiếc)' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-[#6B7280] mb-1 block">
                  {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <input
                  type={field.vnd ? 'text' : 'number'}
                  value={field.vnd ? fmtInput(form[field.key] ?? '') : (form[field.key] ?? '')}
                  onChange={e => update(field.key, field.vnd ? stripDots(e.target.value) : e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]"
                />
              </div>
            ))}
          </div>

          {/* Live calculation */}
          {calc && (
            <div className="mt-4 bg-[#FFF3EE] rounded-xl p-4">
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
        </div>

        {/* Factory description */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <h3 className="text-sm font-semibold text-[#111827] mb-3">Mô tả sản phẩm từ xưởng</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'factoryMaterial', label: 'Chất liệu', type: 'text' },
              { key: 'factoryWeightText', label: 'Trọng lượng (mô tả)', type: 'text' },
              { key: 'factoryDimensions', label: 'Kích thước', type: 'text' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-[#6B7280] mb-1 block">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key] ?? ''}
                  onChange={e => update(field.key, e.target.value)}
                  placeholder="VD: nhựa ABS, 250g/thùng, 30×20×15cm"
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Supplier info */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <h3 className="text-sm font-semibold text-[#111827] mb-3">Thông tin nhà cung cấp</h3>
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
                  value={form[field.key] ?? ''}
                  onChange={e => update(field.key, e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-[#6B7280] mb-1 block">Ghi chú của buyer</label>
            <textarea
              rows={2}
              value={form.buyerNotes ?? ''}
              onChange={e => update('buyerNotes', e.target.value)}
              placeholder="Ghi chú thêm từ NVMH..."
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-[#6B7280] mb-1 block">Ghi chú báo giá</label>
            <textarea
              rows={2}
              value={form.pricingNotes ?? ''}
              onChange={e => update('pricingNotes', e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Photos & Videos */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#111827]">🖼️ Ảnh & Video</h3>
            <div className="flex gap-3 text-xs text-[#9CA3AF]">
              <span>Ảnh {photos.length}/{MAX_PHOTOS}</span>
              <span>Video {videos.length}/{MAX_VIDEOS}</span>
            </div>
          </div>

          {/* Photos row */}
          {(photos.length > 0 || true) && (
            <div className="mb-3">
              <p className="text-xs text-[#6B7280] mb-2 font-medium">Ảnh</p>
              <div className="flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="relative w-16 h-16">
                    <img src={url} alt="" className="w-full h-full rounded-lg object-cover border border-[#E5E7EB]" />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                    >×</button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[#E5E7EB] flex flex-col items-center justify-center cursor-pointer hover:border-[#E05B28] text-[#6B7280] gap-0.5">
                    <span className="text-lg leading-none">🖼</span>
                    <span className="text-[9px]">Thêm</span>
                    <input type="file" accept="image/*,video/*" multiple className="hidden"
                      disabled={uploading}
                      onChange={e => {
                        if (e.target.files?.length) {
                          uploadMedia(Array.from(e.target.files))
                          e.target.value = ''
                        }
                      }} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Videos row */}
          {videos.length > 0 && (
            <div>
              <p className="text-xs text-[#6B7280] mb-2 font-medium">Video</p>
              <div className="flex flex-wrap gap-2">
                {videos.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg border overflow-hidden bg-black">
                    <video src={url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-white text-lg">▶</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVideos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && <p className="text-xs text-[#E05B28] animate-pulse mt-2">⏳ Đang tải lên...</p>}
          <p className="text-[10px] text-[#9CA3AF] mt-2">Chọn nhiều file cùng lúc — ảnh và video đều được</p>
        </div>

        {/* Chat */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <SafeBox>
            <ChatBox productId={productId} currentUser={currentUser} />
          </SafeBox>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
          style={{ backgroundColor: '#E05B28' }}
        >
          {saving ? 'Đang gửi...' : '📤 Gửi báo giá'}
        </button>
      </div>
    </div>
  )
}
