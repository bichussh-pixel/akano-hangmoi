'use client'

import { useEffect, useState, Component } from 'react'
import { calculateLandedCost } from '@/lib/calc'
import ChatBox from '@/components/ui/ChatBox'

// Local error boundary to prevent ChatBox or any child crash from killing the page
class SafeBox extends Component<{ children: React.ReactNode }, { err: string | null }> {
  constructor(props: any) { super(props); this.state = { err: null } }
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  render() {
    if (this.state.err) return (
      <div className="text-xs text-red-500 bg-red-50 rounded p-2">
        Lỗi hiển thị: {this.state.err}
      </div>
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
  dailyRate?: DailyRate
  exportTaxPct?: number
  importTaxPct?: number
}

function fmtNum(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function fmt(n: number) {
  return fmtNum(n) + 'đ'
}

interface PricingContentProps {
  currentUser: { id: string; name: string; role: string }
}

export default function PricingContent({ currentUser }: PricingContentProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [pricedProducts, setPricedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, any>>({})
  const [freightTypes, setFreightTypes] = useState<Record<string, 'nguyen_xe' | 'ghep_xe'>>({})
  const [photos, setPhotos] = useState<Record<string, string[]>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    fetch('/api/pricing/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data)
          setPricedProducts([])
        } else {
          setProducts(data.products || [])
          setPricedProducts(data.pricedProducts || [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function updateForm(productId: string, field: string, value: any) {
    setForms(prev => ({ ...prev, [productId]: { ...(prev[productId] || {}), [field]: value } }))
  }

  function getFreightType(productId: string): 'nguyen_xe' | 'ghep_xe' {
    return freightTypes[productId] || 'nguyen_xe'
  }

  function getCalc(productId: string, product: Product) {
    const f = forms[productId] || {}
    if (!f.factoryCny || !f.volumeM3 || !f.qtyPerBox || !product.dailyRate) return null
    try {
      return calculateLandedCost(
        {
          factoryCny: Number(f.factoryCny),
          weightKg: Number(f.weightKg || 0),
          volumeM3: Number(f.volumeM3 || 0),
          domesticFreightCny: Number(f.domesticFreightCny || 0),
          inspectionCny: Number(f.inspectionCny || 0),
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
        getFreightType(productId)
      )
    } catch { return null }
  }

  async function uploadMedia(productId: string, files: FileList) {
    setUploading(productId)
    try {
      const fileArr = Array.from(files)
      for (const file of fileArr) {
        const fd = new FormData()
        fd.append('image', file)
        const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.url) {
          setPhotos(prev => ({ ...prev, [productId]: [...(prev[productId] || []), data.url] }))
        }
      }
    } finally {
      setUploading(null)
    }
  }

  async function submitPricing(product: Product) {
    const f = forms[product.id] || {}
    setSaving(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          freightType: getFreightType(product.id),
          photos: photos[product.id] || [],
        }),
      })
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== product.id))
        showToast(`Đã gửi báo giá ${product.name}`)
      } else {
        showToast('Lỗi khi gửi báo giá')
      }
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#111827] mb-6">Check giá</h1>
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] h-20" />)}
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">💰 Check giá</h1>
        <p className="text-[#6B7280] mt-1">Nhập thông tin giá xuất xưởng và báo giá</p>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-[#6B7280]">Không có sản phẩm nào cần check giá</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(product => {
            const isOpen = expanded === product.id
            const f = forms[product.id] || {}
            const fType = getFreightType(product.id)
            const calc = getCalc(product.id, product)
            const productPhotos = photos[product.id] || []
            const dr = product.dailyRate

            return (
              <div key={product.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                {/* Header */}
                <button
                  type="button"
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#FAFAFA]"
                  onClick={() => setExpanded(isOpen ? null : product.id)}
                >
                  <span
                    className="px-2 py-0.5 text-xs font-mono rounded font-semibold"
                    style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}
                  >
                    {product.checkCode}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-[#111827]">{product.name}</span>
                  <span className="text-xs text-[#6B7280]">{fmt(product.marketPrice)}</span>
                  {product.growthRate && (
                    <span className="text-xs font-medium text-green-600">+{Number(product.growthRate).toFixed(1)}%</span>
                  )}
                  <span className="text-[#6B7280] ml-2">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <SafeBox>
                  <div className="px-5 pb-5 border-t border-[#F3F4F6] pt-4 space-y-5">
                    {/* Daily rate info */}
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

                    {/* Freight type selector */}
                    {dr && (dr.intlFreightNguyenXe != null || dr.intlFreightGhepXe != null) && (
                      <div>
                        <label className="text-xs font-medium text-[#6B7280] mb-2 block">Loại vận chuyển quốc tế</label>
                        <div className="flex gap-2">
                          {[
                            { value: 'nguyen_xe', label: '🚛 Nguyên Xe', rate: dr.intlFreightNguyenXe },
                            { value: 'ghep_xe', label: '📦 Ghép Xe', rate: dr.intlFreightGhepXe },
                          ].map(opt => (
                            <button
                              type="button"
                              key={opt.value}
                              onClick={() => setFreightTypes(prev => ({ ...prev, [product.id]: opt.value as any }))}
                              className="flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: fType === opt.value ? '#E05B28' : '#F3F4F6',
                                color: fType === opt.value ? 'white' : '#6B7280',
                                borderColor: fType === opt.value ? '#E05B28' : '#E5E7EB',
                              }}
                            >
                              {opt.label}
                              {opt.rate != null && (
                                <span className="ml-1 text-xs opacity-75">({fmtNum(opt.rate)}đ/m³)</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pricing inputs */}
                    <div>
                      <h4 className="text-sm font-semibold text-[#111827] mb-3">Thông tin giá</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'factoryCny', label: 'Giá xuất xưởng (CNY/chiếc)', type: 'number' },
                          { key: 'weightKg', label: 'Cân nặng (kg/chiếc)', type: 'number' },
                          { key: 'volumeM3', label: 'Số khối/chiếc (m³)', type: 'number' },
                          { key: 'domesticFreightCny', label: 'Cước nội địa TQ (CNY/chiếc)', type: 'number' },
                          { key: 'inspectionCny', label: 'Phí kiểm định (CNY/chiếc)', type: 'number' },
                          { key: 'qtyPerBox', label: 'Số lượng/thùng', type: 'number' },
                        ].map(field => (
                          <div key={field.key}>
                            <label className="text-xs font-medium text-[#6B7280] mb-1 block">{field.label}</label>
                            <input
                              type={field.type}
                              value={f[field.key] || ''}
                              onChange={e => updateForm(product.id, field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live calc */}
                    {calc && (
                      <div className="bg-[#FFF3EE] rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-[#E05B28] mb-3">Kết quả tính toán</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between"><span className="text-[#6B7280]">Giá xuất xưởng VND</span><span>{fmt(calc.breakdown.factoryVND)}</span></div>
                          <div className="flex justify-between"><span className="text-[#6B7280]">Thuế xuất khẩu</span><span>{fmt(calc.breakdown.exportTaxAmt)}</span></div>
                          <div className="flex justify-between">
                            <span className="text-[#6B7280]">
                              Cước QT {fType === 'nguyen_xe' ? '(Nguyên Xe)' : '(Ghép Xe)'}
                            </span>
                            <span>{fmt(calc.breakdown.intlFreightAmt)}</span>
                          </div>
                          <div className="flex justify-between"><span className="text-[#6B7280]">Thuế nhập khẩu</span><span>{fmt(calc.breakdown.importTaxAmt)}</span></div>
                          <div className="flex justify-between"><span className="text-[#6B7280]">Cước nội địa</span><span>{fmt(calc.breakdown.domesticVND)}</span></div>
                          <div className="flex justify-between"><span className="text-[#6B7280]">Phí kiểm định</span><span>{fmt(calc.breakdown.inspectionVND)}</span></div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-orange-200 flex justify-between font-bold text-sm">
                          <span className="text-[#E05B28]">TỔNG/chiếc</span>
                          <span className="text-[#E05B28]">{fmt(calc.totalPerUnit)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-sm mt-1">
                          <span className="text-[#111827]">TỔNG/thùng ({f.qtyPerBox} cái)</span>
                          <span className="text-[#111827]">{fmt(calc.totalPerBox)}</span>
                        </div>
                      </div>
                    )}

                    {/* Supplier info */}
                    <div>
                      <h4 className="text-sm font-semibold text-[#111827] mb-3">Thông tin nhà cung cấp</h4>
                      <div className="grid grid-cols-2 gap-3">
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
                              value={f[field.key] || ''}
                              onChange={e => updateForm(product.id, field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3">
                        <label className="text-xs font-medium text-[#6B7280] mb-1 block">Ghi chú báo giá</label>
                        <textarea
                          rows={2}
                          value={f.pricingNotes || ''}
                          onChange={e => updateForm(product.id, 'pricingNotes', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                      <div className="mt-3">
                        <label className="text-xs font-medium text-[#6B7280] mb-1 block">URL video</label>
                        <input
                          type="text"
                          value={f.videoUrl || ''}
                          onChange={e => updateForm(product.id, 'videoUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Photos & Videos */}
                    <div>
                      <h4 className="text-sm font-semibold text-[#111827] mb-2">Ảnh/Video sản phẩm</h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {productPhotos.map((url, i) => {
                          const isVideo = url.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i)
                          return (
                            <div key={i} className="w-16 h-16 rounded-lg border border-[#E5E7EB] overflow-hidden relative bg-black">
                              {isVideo ? (
                                <>
                                  <video src={url} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white text-lg">▶</span>
                                  </div>
                                </>
                              ) : (
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          )
                        })}
                        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[#E5E7EB] flex flex-col items-center justify-center cursor-pointer hover:border-[#E05B28] text-[#6B7280] gap-0.5">
                          <span className="text-xl leading-none">+</span>
                          <span className="text-[10px] leading-tight text-center px-1">Ảnh/Video</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            disabled={uploading === product.id}
                            onChange={e => {
                              if (e.target.files && e.target.files.length > 0) {
                                uploadMedia(product.id, e.target.files)
                              }
                            }}
                          />
                        </label>
                      </div>
                      {uploading === product.id && <p className="text-xs text-[#6B7280]">Đang tải lên...</p>}
                    </div>

                    {/* Chat */}
                    <SafeBox>
                      <ChatBox productId={product.id} currentUser={currentUser} />
                    </SafeBox>

                    <button
                      type="button"
                      onClick={() => submitPricing(product)}
                      disabled={saving === product.id || !f.factoryCny || !f.volumeM3 || !f.qtyPerBox}
                      className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                      style={{ backgroundColor: '#E05B28' }}
                    >
                      {saving === product.id ? 'Đang gửi...' : '📤 Gửi báo giá'}
                    </button>
                  </div>
                  </SafeBox>
                )}
              </div>
            )
          })}
        </div>
      )}

      {pricedProducts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-[#111827] mb-4">📋 Đã báo giá ({pricedProducts.length})</h2>
          <div className="space-y-3">
            {pricedProducts.map(product => {
              const isOpen = expanded === ('priced_' + product.id)
              return (
                <div key={product.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#FAFAFA]"
                    onClick={() => setExpanded(isOpen ? null : ('priced_' + product.id))}
                  >
                    <span className="px-2 py-0.5 text-xs font-mono rounded font-semibold" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
                      {product.checkCode}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-[#111827]">{product.name}</span>
                    {product.totalPerUnit && (
                      <span className="text-sm font-bold" style={{ color: '#E05B28' }}>{fmt(product.totalPerUnit)}/chiếc</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: product.status === 'done' ? '#DCFCE7' : product.status === 'rejected' ? '#FEE2E2' : '#FEF3C7', color: product.status === 'done' ? '#16A34A' : product.status === 'rejected' ? '#DC2626' : '#D97706' }}>
                      {product.status === 'done' ? '✅ Đã chốt' : product.status === 'rejected' ? '❌ Từ chối' : '⏳ Đang chờ chốt'}
                    </span>
                    <span className="text-[#6B7280] ml-2">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <SafeBox>
                      <div className="px-5 pb-5 border-t border-[#F3F4F6] pt-4">
                        <ChatBox productId={product.id} currentUser={currentUser} />
                      </div>
                    </SafeBox>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
