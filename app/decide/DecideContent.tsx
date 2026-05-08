'use client'

import { useEffect, useState } from 'react'
import ChatBox from '@/components/ui/ChatBox'

interface PricingEntry {
  userId: string
  userName: string
  factoryCny: number
  weightKg?: number
  volumeM3?: number
  domesticFreightCny?: number
  inspectionCny?: number
  qtyPerBox?: number
  totalPerUnit: number
  totalPerBox?: number
  pricingBreakdown?: any
  supplierName?: string
  supplierContact?: string
  moq?: string
  leadTime?: string
  pricingNotes?: string
  photos?: string[]
  videoUrl?: string
  freightType?: string
  pricedAt: number
}

interface Product {
  id: string
  name: string
  checkCode: string
  marketPrice: number
  sales30d?: number
  growthRate?: number
  category?: string
  imageUrl?: string
  kaloUrl?: string
  shopUrl?: string
  description?: string
  specWeight?: string
  specDimensions?: string
  specMaterial?: string
  specUseCases?: string
  importQty?: number
  totalPerUnit?: number
  pricedBy?: string
  assignedBuyers: { id: string; name: string }[]
  pricings: PricingEntry[]
}

interface DecidedProduct {
  id: string
  name: string
  checkCode: string
  status: string
  totalPerUnit: number
  importQty: number
  totalImportCost: number
  importWarehouse?: string
  decidedAt?: number
  assignedBuyerId?: string
  assignedBuyerName?: string
  rejectReason?: string
}

interface DecideContentProps {
  currentUser: { id: string; name: string; role: string }
}

function fmt(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
}

function isUrl(s?: string): boolean {
  return !!s && (s.startsWith('http://') || s.startsWith('https://'))
}

function getBestShopLink(p: any): string | null {
  if (isUrl(p.shopUrl)) return p.shopUrl
  if (p.name) return `https://www.tiktok.com/search?q=${encodeURIComponent(p.name)}&type=item`
  return null
}
function getKaloLink(p: any): string | null {
  if (isUrl(p.kaloUrl)) return p.kaloUrl
  if (p.name) return `https://kalodata.com/vn/product/search?keyword=${encodeURIComponent(p.name)}&region=VN`
  return null
}

export default function DecideContent({ currentUser }: DecideContentProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [decided, setDecided] = useState<DecidedProduct[]>([])
  const [tab, setTab] = useState<'pending' | 'decided'>('pending')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedPricing, setSelectedPricing] = useState<Record<string, string>>({})
  const [decisions, setDecisions] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  // cancel / edit state
  const [editPrice, setEditPrice] = useState<Record<string, string>>({})
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function load() {
    setLoading(true)
    fetch('/api/decide/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data)
          setDecided([])
        } else {
          setProducts(data.pending || [])
          setDecided(data.decided || [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function updateDecision(productId: string, field: string, value: any) {
    setDecisions(prev => ({ ...prev, [productId]: { ...(prev[productId] || {}), [field]: value } }))
  }

  async function submitDecision(product: Product) {
    const d = decisions[product.id] || {}
    if (!d.decision) { showToast('Chọn quyết định trước'); return }
    setSaving(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      })
      if (res.ok) {
        showToast(`Đã chốt: ${product.name}`)
        load()
      } else {
        showToast('Lỗi khi lưu')
      }
    } finally {
      setSaving(null)
    }
  }

  async function cancelImport(p: DecidedProduct) {
    if (!confirm(`Huỷ nhập "${p.name}"? Trạng thái sẽ chuyển sang Từ chối.`)) return
    setCancelling(p.id)
    try {
      await fetch(`/api/products/${p.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', rejectReason: 'Huỷ nhập — xưởng không phát hàng' }),
      })
      showToast('Đã huỷ nhập')
      load()
    } finally {
      setCancelling(null)
    }
  }

  async function saveEditPrice(p: DecidedProduct) {
    const price = Number(editPrice[p.id])
    if (!price || price <= 0) { showToast('Nhập giá hợp lệ'); return }
    setEditingPrice(p.id)
    try {
      await fetch(`/api/products/${p.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit_price', newPrice: price }),
      })
      showToast('Đã cập nhật giá')
      setEditPrice(prev => ({ ...prev, [p.id]: '' }))
      load()
    } finally {
      setEditingPrice(null)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#111827] mb-6">Chốt nhập</h1>
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] h-24" />)}
        </div>
      </div>
    )
  }

  const doneCnt = decided.filter(d => d.status === 'done').length
  const totalImport = decided.filter(d => d.status === 'done').reduce((s, d) => s + (d.totalImportCost || 0), 0)

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#111827]">🏁 Chốt nhập hàng</h1>
        <p className="text-[#6B7280] mt-1">Xem báo giá và quyết định nhập hay không</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('pending')}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: tab === 'pending' ? '#E05B28' : '#F3F4F6', color: tab === 'pending' ? 'white' : '#6B7280' }}>
          ⏳ Chờ chốt ({products.length})
        </button>
        <button onClick={() => setTab('decided')}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: tab === 'decided' ? '#E05B28' : '#F3F4F6', color: tab === 'decided' ? 'white' : '#6B7280' }}>
          ✅ Đã chốt ({decided.length})
        </button>
      </div>

      {/* ──── PENDING tab ──── */}
      {tab === 'pending' && (
        products.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-[#6B7280]">Không có sản phẩm nào chờ chốt</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map(product => {
              const isOpen = expanded === product.id
              const d = decisions[product.id] || {}
              const pricings = product.pricings || []
              const activePricingUserId = selectedPricing[product.id] || (pricings[0]?.userId || '')
              const activePricing: PricingEntry | undefined = pricings.find(p => p.userId === activePricingUserId) || pricings[0]
              const bd = activePricing?.pricingBreakdown || {}
              const totalImportCalc = activePricing?.totalPerUnit && d.importQty
                ? activePricing.totalPerUnit * Number(d.importQty) : null

              return (
                <div key={product.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#FAFAFA]"
                    onClick={() => setExpanded(isOpen ? null : product.id)}
                  >
                    <span className="px-2 py-0.5 text-xs font-mono rounded font-semibold" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
                      {product.checkCode}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-[#111827]">{product.name}</span>
                    {activePricing?.totalPerUnit ? (
                      <span className="text-sm font-bold" style={{ color: '#E05B28' }}>{fmt(activePricing.totalPerUnit)}/chiếc</span>
                    ) : null}
                    {pricings.length > 0 && (
                      <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{pricings.length} báo giá</span>
                    )}
                    <span className="text-[#6B7280] ml-2">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-[#F3F4F6] pt-4 space-y-5">

                      {/* Original product info */}
                      <div className="p-4 bg-[#F9FAFB] rounded-xl space-y-3">
                        <div className="flex gap-4">
                          {isUrl(product.imageUrl) && (
                            <img src={product.imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg border border-[#E5E7EB] shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[#111827] text-sm mb-1">{product.name}</div>
                            <div className="flex flex-wrap gap-3 text-xs text-[#6B7280] mb-2">
                              {product.marketPrice > 0 && <span>💰 Giá TT: <strong className="text-[#111827]">{fmt(product.marketPrice)}</strong></span>}
                              {(product.sales30d || 0) > 0 && <span>📦 <strong className="text-[#111827]">{(product.sales30d || 0).toLocaleString()}</strong> đơn/30 ngày</span>}
                              {(product.growthRate || 0) > 0 && <span className="text-green-600 font-semibold">+{Number(product.growthRate).toFixed(1)}%</span>}
                              {product.category && <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>{product.category}</span>}
                              {product.importQty && <span>📦 SL nhập: <strong className="text-[#111827]">{product.importQty}</strong> thùng</span>}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {getBestShopLink(product) && (
                                <a href={getBestShopLink(product)!} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-bold no-underline"
                                  style={{ background: 'linear-gradient(135deg,#EC4899,#DB2777)' }}>🏆 Shop bán chạy</a>
                              )}
                              {getKaloLink(product) && (
                                <a href={getKaloLink(product)!} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold no-underline"
                                  style={{ background: '#EEF2FF', color: '#4361EE', border: '1px solid #C7D2FE' }}>🔗 Kalodata</a>
                              )}
                            </div>
                          </div>
                        </div>
                        {(product.specWeight || product.specDimensions || product.specMaterial || product.specUseCases) && (
                          <div className="border-t border-[#E5E7EB] pt-3">
                            <div className="text-xs font-semibold text-[#6B7280] mb-2">📋 Thông số kỹ thuật</div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-[#374151]">
                              {product.specWeight && <span>🏋️ KL: <strong>{product.specWeight}</strong></span>}
                              {product.specDimensions && <span>📐 KT: <strong>{product.specDimensions}</strong></span>}
                              {product.specMaterial && <span>🧵 CL: <strong>{product.specMaterial}</strong></span>}
                              {product.specUseCases && <span className="col-span-2">✅ Công dụng: <strong>{product.specUseCases}</strong></span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Per-NV pricing */}
                      {pricings.length > 0 && (
                        <div>
                          {pricings.length > 1 && (
                            <div className="flex gap-2 mb-3">
                              {pricings.map(pr => (
                                <button key={pr.userId}
                                  onClick={() => setSelectedPricing(prev => ({ ...prev, [product.id]: pr.userId }))}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
                                  style={{
                                    backgroundColor: activePricingUserId === pr.userId ? '#E05B28' : '#F3F4F6',
                                    color: activePricingUserId === pr.userId ? 'white' : '#6B7280',
                                    borderColor: activePricingUserId === pr.userId ? '#E05B28' : '#E5E7EB',
                                  }}>
                                  👤 {pr.userName}
                                </button>
                              ))}
                            </div>
                          )}

                          {activePricing && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#FFF3EE' }}>
                                <span className="text-base">👤</span>
                                <span className="font-semibold text-[#E05B28]">{activePricing.userName}</span>
                                <span className="text-[#6B7280] text-xs ml-auto">Báo giá: {new Date(activePricing.pricedAt).toLocaleDateString('vi-VN')}</span>
                              </div>

                              <div className="bg-[#F9FAFB] rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-[#111827] mb-3">Chi tiết giá thành</h4>
                                <div className="space-y-1 text-xs">
                                  {bd.factoryVND != null && <div className="flex justify-between"><span className="text-[#6B7280]">Giá xuất xưởng</span><span>{fmt(bd.factoryVND)}</span></div>}
                                  {bd.exportTaxAmt != null && <div className="flex justify-between"><span className="text-[#6B7280]">Thuế xuất khẩu</span><span>{fmt(bd.exportTaxAmt)}</span></div>}
                                  {bd.intlFreightAmt != null && <div className="flex justify-between"><span className="text-[#6B7280]">Cước quốc tế</span><span>{fmt(bd.intlFreightAmt)}</span></div>}
                                  {bd.importTaxAmt != null && <div className="flex justify-between"><span className="text-[#6B7280]">Thuế nhập khẩu</span><span>{fmt(bd.importTaxAmt)}</span></div>}
                                  {bd.domesticVND != null && <div className="flex justify-between"><span className="text-[#6B7280]">Cước nội địa</span><span>{fmt(bd.domesticVND)}</span></div>}
                                  {bd.inspectionVND != null && <div className="flex justify-between"><span className="text-[#6B7280]">Phí kiểm định</span><span>{fmt(bd.inspectionVND)}</span></div>}
                                  {Object.keys(bd).length === 0 && activePricing.factoryCny > 0 && (
                                    <div className="flex justify-between"><span className="text-[#6B7280]">Giá xuất xưởng (CNY)</span><span>{activePricing.factoryCny} CNY</span></div>
                                  )}
                                </div>
                                <div className="mt-2 pt-2 border-t border-[#E5E7EB] flex justify-between font-bold text-sm">
                                  <span style={{ color: '#E05B28' }}>TỔNG/chiếc</span>
                                  <span style={{ color: '#E05B28' }}>{fmt(activePricing.totalPerUnit)}</span>
                                </div>
                                {(activePricing.totalPerBox || 0) > 0 && activePricing.qtyPerBox && (
                                  <div className="flex justify-between text-sm font-medium mt-1">
                                    <span className="text-[#6B7280]">TỔNG/thùng ({activePricing.qtyPerBox} cái)</span>
                                    <span>{fmt(activePricing.totalPerBox!)}</span>
                                  </div>
                                )}
                              </div>

                              {(activePricing.supplierName || activePricing.supplierContact || activePricing.moq || activePricing.leadTime || activePricing.pricingNotes) && (
                                <div className="bg-[#F0FDF4] rounded-xl p-4">
                                  <h4 className="text-sm font-semibold text-[#111827] mb-2">🏭 Thông tin xưởng</h4>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {activePricing.supplierName && <div><span className="text-[#6B7280]">Tên NCC: </span><strong>{activePricing.supplierName}</strong></div>}
                                    {activePricing.supplierContact && <div><span className="text-[#6B7280]">Liên hệ: </span><strong>{activePricing.supplierContact}</strong></div>}
                                    {activePricing.moq && <div><span className="text-[#6B7280]">MOQ: </span><strong>{activePricing.moq}</strong></div>}
                                    {activePricing.leadTime && <div><span className="text-[#6B7280]">Lead time: </span><strong>{activePricing.leadTime}</strong></div>}
                                    {activePricing.pricingNotes && <div className="col-span-2"><span className="text-[#6B7280]">Ghi chú: </span>{activePricing.pricingNotes}</div>}
                                  </div>
                                </div>
                              )}

                              {activePricing.photos && activePricing.photos.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-[#111827] mb-2">🖼️ Ảnh/Video</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {activePricing.photos.map((url: string, i: number) => {
                                      const isVideo = url.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i) || url.startsWith('data:video/')
                                      return isVideo
                                        ? <video key={i} src={url} controls className="w-32 h-20 object-cover rounded-lg border border-[#E5E7EB] bg-black" />
                                        : <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-[#E5E7EB]" />
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <ChatBox productId={product.id} currentUser={currentUser} />

                      {/* Decision */}
                      <div className="border border-[#E5E7EB] rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-[#111827] mb-3">Quyết định</h4>
                        <div className="flex gap-3 mb-4">
                          {[
                            { val: 'import', label: '✅ Nhập hàng', bg: '#DCFCE7', color: '#16A34A' },
                            { val: 'reject', label: '❌ Không nhập', bg: '#FEE2E2', color: '#DC2626' },
                          ].map(opt => (
                            <button key={opt.val}
                              onClick={() => updateDecision(product.id, 'decision', opt.val)}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                              style={{
                                backgroundColor: d.decision === opt.val ? opt.bg : '#F3F4F6',
                                color: d.decision === opt.val ? opt.color : '#6B7280',
                                border: `2px solid ${d.decision === opt.val ? opt.color : 'transparent'}`,
                              }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {d.decision === 'import' && (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-[#6B7280] mb-1 block">Người phụ trách</label>
                              <select value={d.assignedBuyerId || ''} onChange={e => updateDecision(product.id, 'assignedBuyerId', e.target.value)}
                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none">
                                <option value="">-- Chọn NVMH --</option>
                                {product.assignedBuyers.map(a => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                                {product.pricings.map(pr => (
                                  <option key={pr.userId + '_pr'} value={pr.userId}>{pr.userName} (báo giá)</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-[#6B7280] mb-1 block">Số lượng nhập</label>
                                <input type="number" value={d.importQty || ''} onChange={e => updateDecision(product.id, 'importQty', e.target.value)}
                                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-[#6B7280] mb-1 block">Kho nhập</label>
                                <select value={d.importWarehouse || ''} onChange={e => updateDecision(product.id, 'importWarehouse', e.target.value)}
                                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none">
                                  <option value="">-- Chọn kho --</option>
                                  <option value="HN">Hà Nội</option>
                                  <option value="SG">Sài Gòn</option>
                                  <option value="BOTH">Cả hai</option>
                                </select>
                              </div>
                            </div>
                            {totalImportCalc && (
                              <div className="text-sm font-semibold p-3 rounded-lg" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                                Tổng chi phí nhập: {fmt(totalImportCalc)}
                              </div>
                            )}
                          </div>
                        )}

                        {d.decision === 'reject' && (
                          <div>
                            <label className="text-xs font-medium text-[#6B7280] mb-1 block">Lý do từ chối</label>
                            <textarea rows={2} value={d.rejectReason || ''} onChange={e => updateDecision(product.id, 'rejectReason', e.target.value)}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none" />
                          </div>
                        )}

                        <button onClick={() => submitDecision(product)}
                          disabled={saving === product.id || !d.decision}
                          className="w-full mt-3 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                          style={{ backgroundColor: '#E05B28' }}>
                          {saving === product.id ? 'Đang lưu...' : 'Xác nhận quyết định'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ──── DECIDED tab ──── */}
      {tab === 'decided' && (
        <div className="space-y-4">
          {/* Summary bar */}
          {doneCnt > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-wrap gap-6 text-sm">
              <span>✅ <strong>{doneCnt}</strong> mã đã nhập</span>
              <span>💰 Tổng chi phí: <strong style={{ color: '#E05B28' }}>{fmt(totalImport)}</strong></span>
            </div>
          )}

          {decided.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-[#6B7280]">Chưa có mã nào được chốt</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
              {decided.map(p => {
                const isDone = p.status === 'done'
                const isExpanded = expanded === ('dec_' + p.id)
                return (
                  <div key={p.id}>
                    <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#FAFAFA]"
                      onClick={() => setExpanded(isExpanded ? null : ('dec_' + p.id))}>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0" style={{ background: '#FFF3EE', color: '#E05B28' }}>
                        {p.checkCode}
                      </span>
                      <span className="flex-1 text-sm font-medium text-[#111827] truncate">{p.name}</span>
                      {isDone ? (
                        <>
                          <span className="text-xs font-semibold shrink-0" style={{ color: '#E05B28' }}>{fmt(p.totalPerUnit)}/chiếc</span>
                          <span className="text-xs text-[#6B7280] shrink-0">{p.importQty} thùng</span>
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: '#DCFCE7', color: '#16A34A' }}>✅ Đã chốt</span>
                        </>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: '#FEE2E2', color: '#DC2626' }}>❌ Từ chối</span>
                      )}
                      <span className="text-[#6B7280] text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-[#F3F4F6] pt-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {p.decidedAt && <div><span className="text-[#6B7280]">Ngày chốt: </span><strong>{new Date(p.decidedAt).toLocaleDateString('vi-VN')}</strong></div>}
                          {p.assignedBuyerName && <div><span className="text-[#6B7280]">NV mua hàng: </span><strong>{p.assignedBuyerName}</strong></div>}
                          {isDone && <div><span className="text-[#6B7280]">Giá chốt: </span><strong style={{ color: '#E05B28' }}>{fmt(p.totalPerUnit)}/chiếc</strong></div>}
                          {isDone && <div><span className="text-[#6B7280]">SL nhập: </span><strong>{p.importQty} thùng</strong></div>}
                          {isDone && p.totalImportCost > 0 && <div className="col-span-2"><span className="text-[#6B7280]">Tổng chi phí: </span><strong style={{ color: '#E05B28' }}>{fmt(p.totalImportCost)}</strong></div>}
                          {p.importWarehouse && <div><span className="text-[#6B7280]">Kho: </span><strong>{p.importWarehouse}</strong></div>}
                          {p.rejectReason && <div className="col-span-2"><span className="text-[#6B7280]">Lý do từ chối: </span>{p.rejectReason}</div>}
                        </div>

                        {isDone && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F3F4F6]">
                            {/* Edit price */}
                            <div className="flex gap-2 flex-1">
                              <input type="number" placeholder="Sửa giá mới..."
                                value={editPrice[p.id] || ''}
                                onChange={e => setEditPrice(prev => ({ ...prev, [p.id]: e.target.value }))}
                                className="flex-1 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#E05B28]" />
                              <button onClick={() => saveEditPrice(p)}
                                disabled={editingPrice === p.id || !editPrice[p.id]}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                                style={{ backgroundColor: '#2563EB' }}>
                                {editingPrice === p.id ? '...' : '✏️ Sửa giá'}
                              </button>
                            </div>
                            {/* Cancel */}
                            <button onClick={() => cancelImport(p)}
                              disabled={cancelling === p.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                              style={{ backgroundColor: '#DC2626' }}>
                              {cancelling === p.id ? '...' : '🚫 Huỷ nhập'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
