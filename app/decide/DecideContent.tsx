'use client'

import { useEffect, useState } from 'react'
import ChatBox from '@/components/ui/ChatBox'

interface PricingEntry {
  userId: string
  userName: string
  factoryCny: number
  weightKg?: number
  weightKgPerBox?: number
  volumeM3?: number
  volumeM3PerBox?: number
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
  buyerNotes?: string
  factoryMaterial?: string
  factoryWeightText?: string
  factoryDimensions?: string
  photos?: string[]
  videos?: string[]
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

interface PriceEditLog {
  oldPrice: number
  newPrice: number
  editedBy: string
  editedAt: number
}

interface DecidedProduct {
  id: string
  name: string
  checkCode: string
  status: string
  totalPerUnit: number
  importQty: number
  importQtyHN?: number
  importQtySG?: number
  totalImportCost: number
  totalImportCostHN?: number
  totalImportCostSG?: number
  importWarehouse?: string
  decidedAt?: number
  assignedBuyerId?: string
  assignedBuyerName?: string
  rejectReason?: string
  priceEditLog?: PriceEditLog[]
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
  const [showCompare, setShowCompare] = useState<Record<string, boolean>>({})
  const [decisions, setDecisions] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [editPrice, setEditPrice] = useState<Record<string, string>>({})
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [showPriceLog, setShowPriceLog] = useState<string | null>(null)

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

  function calcTotalCost(activePricing: PricingEntry | undefined, d: any) {
    if (!activePricing) return { hn: 0, sg: 0, total: 0 }
    const pricePerBox = activePricing.totalPerBox || (activePricing.totalPerUnit * (activePricing.qtyPerBox || 1))
    const qtyHN = parseInt(d.importQtyHN || '0') || 0
    const qtySG = parseInt(d.importQtySG || '0') || 0
    return {
      hn: qtyHN * pricePerBox,
      sg: qtySG * pricePerBox,
      total: (qtyHN + qtySG) * pricePerBox,
    }
  }

  async function submitDecision(product: Product) {
    const d = decisions[product.id] || {}
    if (!d.decision) { showToast('Chọn quyết định trước'); return }
    const activePricingUserId = selectedPricing[product.id] || (product.pricings[0]?.userId ?? '')
    const activePricing = product.pricings.find(pr => pr.userId === activePricingUserId) || product.pricings[0]
    setSaving(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...d, selectedPricingUserId: activePricingUserId }),
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

      {/* PENDING tab */}
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
              const activePricingUserId = selectedPricing[product.id] || (pricings[0]?.userId ?? '')
              const activePricing = pricings.find(pr => pr.userId === activePricingUserId) || pricings[0]
              const bd = activePricing?.pricingBreakdown || {}
              const isComparing = showCompare[product.id] && pricings.length > 1
              const costs = calcTotalCost(activePricing, d)

              return (
                <div key={product.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                  <button
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-[#FAFAFA]"
                    onClick={() => setExpanded(isOpen ? null : product.id)}
                  >
                    <span className="px-2 py-0.5 text-xs font-mono rounded font-semibold shrink-0 mt-0.5" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
                      {product.checkCode}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111827] truncate">{product.name}</p>
                      {activePricing && (
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          💰 {fmt(activePricing.totalPerUnit)}/chiếc
                          {pricings.length > 1 && <span className="ml-2">👥 {pricings.length} báo giá</span>}
                        </p>
                      )}
                    </div>
                    <span className="text-[#6B7280] text-xs shrink-0 mt-0.5">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 border-t border-[#F3F4F6] pt-4 space-y-4">
                      {/* Product info */}
                      <div className="flex gap-3 p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                        {isUrl(product.imageUrl) && (
                          <img src={product.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E5E7EB] shrink-0"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-3 text-xs text-[#6B7280] mb-2">
                            {product.marketPrice > 0 && <span>💰 Giá TT: <strong className="text-[#111827]">{fmt(product.marketPrice)}</strong></span>}
                            {(product.sales30d || 0) > 0 && <span>📦 <strong className="text-[#111827]">{(product.sales30d || 0).toLocaleString()}</strong> đơn/30 ngày</span>}
                            {(product.growthRate || 0) > 0 && <span className="text-green-600 font-semibold">+{Number(product.growthRate).toFixed(1)}%</span>}
                            {product.category && <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>{product.category}</span>}
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

                      {/* Per-NV pricing — tab switcher or compare table */}
                      {pricings.length > 0 && (
                        <div>
                          {pricings.length > 1 && (
                            <div className="flex gap-2 mb-3 flex-wrap">
                              {pricings.map(pr => (
                                <button key={pr.userId}
                                  onClick={() => {
                                    setSelectedPricing(prev => ({ ...prev, [product.id]: pr.userId }))
                                    setShowCompare(prev => ({ ...prev, [product.id]: false }))
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
                                  style={{
                                    backgroundColor: activePricingUserId === pr.userId && !isComparing ? '#E05B28' : '#F3F4F6',
                                    color: activePricingUserId === pr.userId && !isComparing ? 'white' : '#6B7280',
                                    borderColor: activePricingUserId === pr.userId && !isComparing ? '#E05B28' : '#E5E7EB',
                                  }}>
                                  👤 {pr.userName}
                                </button>
                              ))}
                              <button
                                onClick={() => setShowCompare(prev => ({ ...prev, [product.id]: !isComparing }))}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                                style={{
                                  backgroundColor: isComparing ? '#4361EE' : '#EEF2FF',
                                  color: isComparing ? 'white' : '#4361EE',
                                  borderColor: isComparing ? '#4361EE' : '#C7D2FE',
                                }}>
                                ⚖️ So sánh
                              </button>
                            </div>
                          )}

                          {/* Comparison table */}
                          {isComparing ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-[#F9FAFB]">
                                    <th className="text-left px-3 py-2 text-[#6B7280] font-medium border border-[#E5E7EB]">Tiêu chí</th>
                                    {pricings.map(pr => (
                                      <th key={pr.userId} className="text-center px-3 py-2 text-[#111827] font-semibold border border-[#E5E7EB]">
                                        {pr.userName}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { label: 'Giá xuất xưởng (CNY)', key: (pr: PricingEntry) => `${pr.factoryCny} CNY` },
                                    { label: 'Tổng/chiếc', key: (pr: PricingEntry) => <strong style={{ color: '#E05B28' }}>{fmt(pr.totalPerUnit)}</strong> },
                                    { label: 'Tổng/thùng', key: (pr: PricingEntry) => pr.totalPerBox ? fmt(pr.totalPerBox) : '—' },
                                    { label: 'Số lượng/thùng', key: (pr: PricingEntry) => pr.qtyPerBox ? `${pr.qtyPerBox} cái` : '—' },
                                    { label: 'MOQ', key: (pr: PricingEntry) => pr.moq || '—' },
                                    { label: 'Lead time', key: (pr: PricingEntry) => pr.leadTime || '—' },
                                    { label: 'Loại vận chuyển', key: (pr: PricingEntry) => pr.freightType === 'nguyen_xe' ? 'Nguyên Xe' : pr.freightType === 'ghep_xe' ? 'Ghép Xe' : '—' },
                                    { label: 'Chất liệu xưởng', key: (pr: PricingEntry) => pr.factoryMaterial || '—' },
                                    { label: 'KT xưởng', key: (pr: PricingEntry) => pr.factoryDimensions || '—' },
                                    { label: 'NCC', key: (pr: PricingEntry) => pr.supplierName || '—' },
                                  ].map(row => (
                                    <tr key={row.label} className="hover:bg-[#FAFAFA]">
                                      <td className="px-3 py-1.5 text-[#6B7280] border border-[#E5E7EB]">{row.label}</td>
                                      {pricings.map(pr => (
                                        <td key={pr.userId} className="text-center px-3 py-1.5 border border-[#E5E7EB]">
                                          {row.key(pr) as any}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : activePricing && (
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
                                  {bd.inspectionVND != null && bd.inspectionVND > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Phí kiểm định</span><span>{fmt(bd.inspectionVND)}</span></div>}
                                  {bd.quarantineVND != null && bd.quarantineVND > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Phí kiểm dịch</span><span>{fmt(bd.quarantineVND)}</span></div>}
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

                              {/* Factory description */}
                              {(activePricing.factoryMaterial || activePricing.factoryDimensions || activePricing.factoryWeightText) && (
                                <div className="bg-[#F9FAFB] rounded-xl p-4 text-xs">
                                  <h4 className="text-sm font-semibold text-[#111827] mb-2">Mô tả từ xưởng</h4>
                                  <div className="grid grid-cols-2 gap-2 text-[#374151]">
                                    {activePricing.factoryMaterial && <div><span className="text-[#6B7280]">Chất liệu:</span> {activePricing.factoryMaterial}</div>}
                                    {activePricing.factoryWeightText && <div><span className="text-[#6B7280]">Trọng lượng:</span> {activePricing.factoryWeightText}</div>}
                                    {activePricing.factoryDimensions && <div className="col-span-2"><span className="text-[#6B7280]">Kích thước:</span> {activePricing.factoryDimensions}</div>}
                                  </div>
                                </div>
                              )}

                              {/* Supplier info */}
                              {(activePricing.supplierName || activePricing.supplierContact || activePricing.moq || activePricing.leadTime) && (
                                <div className="bg-[#F9FAFB] rounded-xl p-4 text-xs">
                                  <h4 className="text-sm font-semibold text-[#111827] mb-2">Thông tin NCC</h4>
                                  <div className="grid grid-cols-2 gap-2 text-[#374151]">
                                    {activePricing.supplierName && <div><span className="text-[#6B7280]">Tên:</span> {activePricing.supplierName}</div>}
                                    {activePricing.supplierContact && <div><span className="text-[#6B7280]">LH:</span> {activePricing.supplierContact}</div>}
                                    {activePricing.moq && <div><span className="text-[#6B7280]">MOQ:</span> {activePricing.moq}</div>}
                                    {activePricing.leadTime && <div><span className="text-[#6B7280]">Lead:</span> {activePricing.leadTime}</div>}
                                  </div>
                                  {activePricing.buyerNotes && <p className="mt-2 text-[#374151]"><span className="text-[#6B7280]">Ghi chú buyer:</span> {activePricing.buyerNotes}</p>}
                                  {activePricing.pricingNotes && <p className="mt-1 text-[#374151]"><span className="text-[#6B7280]">Ghi chú báo giá:</span> {activePricing.pricingNotes}</p>}
                                </div>
                              )}

                              {/* Photos */}
                              {(activePricing.photos || []).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-[#6B7280] mb-2">🖼️ Ảnh sản phẩm</p>
                                  <div className="flex flex-wrap gap-2">
                                    {activePricing.photos!.map((url, i) => (
                                      <div key={i} className="w-16 h-16 rounded-lg border overflow-hidden bg-[#F9FAFB]">
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Videos */}
                              {(activePricing.videos || []).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-[#6B7280] mb-2">🎥 Video</p>
                                  <div className="flex flex-wrap gap-2">
                                    {activePricing.videos!.map((url, i) => (
                                      <div key={i} className="w-20 h-16 rounded-lg border overflow-hidden bg-black relative">
                                        <video src={url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-white text-lg">▶</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {activePricing.videoUrl && isUrl(activePricing.videoUrl) && (
                                <a href={activePricing.videoUrl} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 underline">
                                  🎥 Xem video
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Chat */}
                      <ChatBox productId={product.id} currentUser={currentUser} />

                      {/* Decision form */}
                      <div className="border-t border-[#E5E7EB] pt-4">
                        <h4 className="text-sm font-semibold text-[#111827] mb-3">🏁 Quyết định</h4>
                        <div className="flex gap-2 mb-4">
                          {[
                            { v: 'import', label: '✅ Nhập hàng', bg: '#DCFCE7', color: '#16A34A', activeBg: '#16A34A' },
                            { v: 'reject', label: '❌ Không nhập', bg: '#FEE2E2', color: '#DC2626', activeBg: '#DC2626' },
                          ].map(opt => (
                            <button key={opt.v}
                              onClick={() => updateDecision(product.id, 'decision', opt.v)}
                              className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-colors"
                              style={{
                                backgroundColor: d.decision === opt.v ? opt.activeBg : opt.bg,
                                color: d.decision === opt.v ? 'white' : opt.color,
                                borderColor: d.decision === opt.v ? opt.activeBg : 'transparent',
                              }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {d.decision === 'import' && (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-[#6B7280] mb-1 block">NVMH thực hiện nhập</label>
                              <div className="flex flex-wrap gap-2">
                                {product.assignedBuyers.map(b => (
                                  <button key={b.id}
                                    onClick={() => updateDecision(product.id, 'assignedBuyerId', b.id)}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium"
                                    style={{
                                      backgroundColor: d.assignedBuyerId === b.id ? '#E05B28' : '#F3F4F6',
                                      color: d.assignedBuyerId === b.id ? 'white' : '#6B7280',
                                    }}>
                                    {b.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Per-warehouse quantity */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-[#6B7280] mb-1 block">SL nhập kho HN (thùng)</label>
                                <input type="number" min="0" value={d.importQtyHN || ''}
                                  onChange={e => updateDecision(product.id, 'importQtyHN', e.target.value)}
                                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-[#6B7280] mb-1 block">SL nhập kho SG (thùng)</label>
                                <input type="number" min="0" value={d.importQtySG || ''}
                                  onChange={e => updateDecision(product.id, 'importQtySG', e.target.value)}
                                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none" />
                              </div>
                            </div>

                            {/* Cost preview per warehouse */}
                            {(d.importQtyHN || d.importQtySG) && activePricing && (
                              <div className="bg-[#FFF3EE] rounded-lg p-3 text-xs space-y-1">
                                {costs.hn > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-[#6B7280]">Kho HN ({d.importQtyHN} thùng):</span>
                                    <strong style={{ color: '#E05B28' }}>{fmt(costs.hn)}</strong>
                                  </div>
                                )}
                                {costs.sg > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-[#6B7280]">Kho SG ({d.importQtySG} thùng):</span>
                                    <strong style={{ color: '#E05B28' }}>{fmt(costs.sg)}</strong>
                                  </div>
                                )}
                                <div className="flex justify-between pt-1 border-t border-orange-200 font-semibold text-sm">
                                  <span>Tổng tiền nhập:</span>
                                  <span style={{ color: '#E05B28' }}>{fmt(costs.total)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {d.decision === 'reject' && (
                          <div>
                            <label className="text-xs font-medium text-[#6B7280] mb-1 block">Lý do không nhập</label>
                            <textarea rows={2} value={d.rejectReason || ''}
                              onChange={e => updateDecision(product.id, 'rejectReason', e.target.value)}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none" />
                          </div>
                        )}

                        <button
                          onClick={() => submitDecision(product)}
                          disabled={saving === product.id || !d.decision}
                          className="mt-3 w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
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

      {/* DECIDED tab */}
      {tab === 'decided' && (
        decided.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-[#6B7280]">Chưa có sản phẩm nào được chốt</p>
          </div>
        ) : (
          <div>
            <div className="bg-[#FFF3EE] rounded-xl p-4 mb-4 flex flex-wrap gap-6">
              <div><div className="text-xs text-[#6B7280]">Số mã đã chốt</div><div className="text-xl font-bold text-[#111827]">{doneCnt}</div></div>
              <div><div className="text-xs text-[#6B7280]">Tổng tiền nhập</div><div className="text-xl font-bold" style={{ color: '#E05B28' }}>{fmt(totalImport)}</div></div>
            </div>
            <div className="space-y-3">
              {decided.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-0.5 text-xs font-mono rounded font-semibold shrink-0" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>{p.checkCode}</span>
                    <span className="flex-1 text-sm font-semibold text-[#111827] truncate">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: p.status === 'done' ? '#DCFCE7' : '#FEE2E2', color: p.status === 'done' ? '#16A34A' : '#DC2626' }}>
                      {p.status === 'done' ? '✅ Nhập' : '❌ Không'}
                    </span>
                  </div>
                  <div className="text-xs text-[#6B7280] flex flex-wrap gap-3 mb-2">
                    {p.decidedAt && <span>📅 {new Date(p.decidedAt).toLocaleDateString('vi-VN')}</span>}
                    {p.assignedBuyerName && <span>👤 {p.assignedBuyerName}</span>}
                    {p.totalPerUnit > 0 && <span>💰 {fmt(p.totalPerUnit)}/chiếc</span>}
                    {p.rejectReason && <span>📝 {p.rejectReason}</span>}
                  </div>

                  {/* Per-warehouse breakdown */}
                  {p.status === 'done' && (
                    <div className="text-xs flex flex-wrap gap-3 mb-2">
                      {(p.importQtyHN || 0) > 0 && (
                        <span className="px-2 py-1 rounded" style={{ backgroundColor: '#EFF6FF' }}>
                          🏢 HN: <strong>{p.importQtyHN} thùng</strong>
                          {p.totalImportCostHN ? <span className="ml-1 text-blue-600">{fmt(p.totalImportCostHN)}</span> : null}
                        </span>
                      )}
                      {(p.importQtySG || 0) > 0 && (
                        <span className="px-2 py-1 rounded" style={{ backgroundColor: '#F0FDF4' }}>
                          🏢 SG: <strong>{p.importQtySG} thùng</strong>
                          {p.totalImportCostSG ? <span className="ml-1 text-green-600">{fmt(p.totalImportCostSG)}</span> : null}
                        </span>
                      )}
                      {p.totalImportCost > 0 && (
                        <span className="font-semibold" style={{ color: '#E05B28' }}>💵 Tổng: {fmt(p.totalImportCost)}</span>
                      )}
                    </div>
                  )}

                  {p.status === 'done' && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <div className="flex gap-1 flex-1 min-w-[160px]">
                        <input type="number" placeholder="Sửa giá/chiếc"
                          value={editPrice[p.id] || ''}
                          onChange={e => setEditPrice(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="flex-1 px-2 py-1.5 border border-[#E5E7EB] rounded-lg text-xs focus:outline-none" />
                        <button
                          onClick={() => saveEditPrice(p)}
                          disabled={editingPrice === p.id || !editPrice[p.id]}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                          style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
                          {editingPrice === p.id ? '...' : '✏️ Sửa giá'}
                        </button>
                      </div>
                      {(p.priceEditLog || []).length > 0 && (
                        <button
                          onClick={() => setShowPriceLog(showPriceLog === p.id ? null : p.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                          📋 Lịch sử ({p.priceEditLog!.length})
                        </button>
                      )}
                      <button
                        onClick={() => cancelImport(p)}
                        disabled={cancelling === p.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                        style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                        {cancelling === p.id ? '...' : '🚫 Huỷ nhập'}
                      </button>
                    </div>
                  )}

                  {/* Price edit log */}
                  {showPriceLog === p.id && (p.priceEditLog || []).length > 0 && (
                    <div className="mt-3 border border-[#E5E7EB] rounded-lg overflow-hidden">
                      <div className="bg-[#F9FAFB] px-3 py-2 text-xs font-semibold text-[#6B7280]">Lịch sử sửa giá</div>
                      <div className="divide-y divide-[#F3F4F6]">
                        {p.priceEditLog!.map((log, i) => (
                          <div key={i} className="px-3 py-2 text-xs flex justify-between items-center">
                            <span className="text-[#6B7280]">
                              {new Date(log.editedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>
                              <span className="text-[#9CA3AF] line-through mr-2">{fmt(log.oldPrice)}</span>
                              <span className="font-semibold" style={{ color: '#E05B28' }}>{fmt(log.newPrice)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}
