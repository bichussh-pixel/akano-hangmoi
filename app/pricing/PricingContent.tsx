'use client'

import { useEffect, useState } from 'react'
import { calculateLandedCost } from '@/lib/calc'
import ChatBox from '@/components/ui/ChatBox'

interface Product {
  id: string
  name: string
  checkCode: string
  marketPrice: number
  growthRate?: number
  dailyRate?: { fxRate: number; intlFreightPerKg: number }
  exportTaxPct?: number
  importTaxPct?: number
}

interface PricingContentProps {
  currentUser: { id: string; name: string; role: string }
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫'
}

export default function PricingContent({ currentUser }: PricingContentProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, any>>({})
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
      .then(data => { setProducts(Array.isArray(data) ? data : (data.products || [])); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function updateForm(productId: string, field: string, value: any) {
    setForms(prev => ({ ...prev, [productId]: { ...(prev[productId] || {}), [field]: value } }))
  }

  function getCalc(productId: string, product: Product) {
    const f = forms[productId] || {}
    if (!f.factoryCny || !f.weightKg || !f.qtyPerBox || !product.dailyRate) return null
    try {
      return calculateLandedCost(
        {
          factoryCny: Number(f.factoryCny),
          weightKg: Number(f.weightKg),
          domesticFreightCny: Number(f.domesticFreightCny || 0),
          inspectionCny: Number(f.inspectionCny || 0),
          qtyPerBox: Number(f.qtyPerBox),
        },
        {
          fxRate: Number(product.dailyRate.fxRate),
          intlFreightPerKg: Number(product.dailyRate.intlFreightPerKg),
          exportTaxPct: Number(product.exportTaxPct || 0),
          importTaxPct: Number(product.importTaxPct || 0),
        }
      )
    } catch { return null }
  }

  async function uploadPhoto(productId: string, file: File) {
    setUploading(productId)
    const fd = new FormData()
    fd.append('image', file)
    try {
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json()
      setPhotos(prev => ({ ...prev, [productId]: [...(prev[productId] || []), data.url] }))
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
            const calc = getCalc(product.id, product)
            const productPhotos = photos[product.id] || []

            return (
              <div key={product.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                {/* Header */}
                <button
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
                  <div className="px-5 pb-5 border-t border-[#F3F4F6] pt-4 space-y-5">
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
                          <div className="flex justify-between"><span className="text-[#6B7280]">Cước quốc tế</span><span>{fmt(calc.breakdown.intlFreightAmt)}</span></div>
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

                    {/* Photos */}
                    <div>
                      <h4 className="text-sm font-semibold text-[#111827] mb-2">Ảnh sản phẩm (tối đa 5)</h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {productPhotos.map((url, i) => (
                          <div key={i} className="w-16 h-16 rounded-lg border border-[#E5E7EB] overflow-hidden">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {productPhotos.length < 5 && (
                          <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[#E5E7EB] flex items-center justify-center cursor-pointer hover:border-[#E05B28] text-[#6B7280]">
                            <span className="text-xl">+</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploading === product.id}
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) uploadPhoto(product.id, file)
                              }}
                            />
                          </label>
                        )}
                      </div>
                      {uploading === product.id && <p className="text-xs text-[#6B7280]">Đang tải ảnh...</p>}
                    </div>

                    {/* Chat */}
                    <ChatBox productId={product.id} currentUser={currentUser} />

                    <button
                      onClick={() => submitPricing(product)}
                      disabled={saving === product.id || !f.factoryCny || !f.weightKg || !f.qtyPerBox}
                      className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                      style={{ backgroundColor: '#E05B28' }}
                    >
                      {saving === product.id ? 'Đang gửi...' : '📤 Gửi báo giá'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
