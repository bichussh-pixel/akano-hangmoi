'use client'

import { useEffect, useState } from 'react'
import ChatBox from '@/components/ui/ChatBox'

interface Product {
  id: string
  name: string
  checkCode: string
  marketPrice: number
  totalPerUnit?: number
  totalPerBox?: number
  pricingBreakdown?: any
  factoryCny?: number
  weightKg?: number
  qtyPerBox?: number
  supplierName?: string
  supplierContact?: string
  moq?: string
  leadTime?: string
  pricingNotes?: string
  photos: string[]
  assignments: { user: { id: string; name: string } }[]
  dailyRate?: { fxRate: number }
}

interface DecideContentProps {
  currentUser: { id: string; name: string; role: string }
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫'
}

export default function DecideContent({ currentUser }: DecideContentProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    fetch('/api/decide/products')
      .then(r => r.json())
      .then(data => { setProducts(Array.isArray(data) ? data : (data.products || [])); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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
        setProducts(prev => prev.filter(p => p.id !== product.id))
        showToast(`Đã chốt quyết định: ${product.name}`)
      } else {
        showToast('Lỗi khi lưu')
      }
    } finally {
      setSaving(null)
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

  return (
    <div className="max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">🏁 Chốt nhập hàng</h1>
        <p className="text-[#6B7280] mt-1">Xem báo giá và quyết định nhập hay không</p>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-[#6B7280]">Không có sản phẩm nào chờ chốt</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(product => {
            const isOpen = expanded === product.id
            const d = decisions[product.id] || {}
            const bd = product.pricingBreakdown || {}
            const totalImport = product.totalPerUnit && d.importQty
              ? product.totalPerUnit * Number(d.importQty)
              : null

            return (
              <div key={product.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
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
                  {product.totalPerUnit && (
                    <span className="text-sm font-bold" style={{ color: '#E05B28' }}>
                      {fmt(product.totalPerUnit)}/chiếc
                    </span>
                  )}
                  <span className="text-[#6B7280] ml-2">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[#F3F4F6] pt-4 space-y-5">
                    {/* Pricing breakdown */}
                    {product.totalPerUnit && (
                      <div className="bg-[#F9FAFB] rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-[#111827] mb-3">Chi tiết giá thành</h4>
                        <div className="space-y-1 text-xs">
                          {bd.factoryVND && <div className="flex justify-between"><span className="text-[#6B7280]">Giá xuất xưởng</span><span>{fmt(bd.factoryVND)}</span></div>}
                          {bd.exportTaxAmt !== undefined && <div className="flex justify-between"><span className="text-[#6B7280]">Thuế xuất khẩu</span><span>{fmt(bd.exportTaxAmt)}</span></div>}
                          {bd.intlFreightAmt !== undefined && <div className="flex justify-between"><span className="text-[#6B7280]">Cước quốc tế</span><span>{fmt(bd.intlFreightAmt)}</span></div>}
                          {bd.importTaxAmt !== undefined && <div className="flex justify-between"><span className="text-[#6B7280]">Thuế nhập khẩu</span><span>{fmt(bd.importTaxAmt)}</span></div>}
                          {bd.domesticVND !== undefined && <div className="flex justify-between"><span className="text-[#6B7280]">Cước nội địa</span><span>{fmt(bd.domesticVND)}</span></div>}
                          {bd.inspectionVND !== undefined && <div className="flex justify-between"><span className="text-[#6B7280]">Phí kiểm định</span><span>{fmt(bd.inspectionVND)}</span></div>}
                        </div>
                        <div className="mt-2 pt-2 border-t border-[#E5E7EB] flex justify-between font-bold text-sm">
                          <span style={{ color: '#E05B28' }}>TỔNG/chiếc</span>
                          <span style={{ color: '#E05B28' }}>{fmt(product.totalPerUnit)}</span>
                        </div>
                        {product.totalPerBox && (
                          <div className="flex justify-between text-sm font-medium mt-1">
                            <span className="text-[#6B7280]">TỔNG/thùng ({product.qtyPerBox} cái)</span>
                            <span>{fmt(product.totalPerBox)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Supplier info */}
                    {(product.supplierName || product.moq) && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {product.supplierName && <div><span className="text-[#6B7280]">NCC: </span>{product.supplierName}</div>}
                        {product.supplierContact && <div><span className="text-[#6B7280]">Liên hệ: </span>{product.supplierContact}</div>}
                        {product.moq && <div><span className="text-[#6B7280]">MOQ: </span>{product.moq}</div>}
                        {product.leadTime && <div><span className="text-[#6B7280]">Lead time: </span>{product.leadTime}</div>}
                      </div>
                    )}

                    {/* Photos */}
                    {product.photos && product.photos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#111827] mb-2">Ảnh sản phẩm</h4>
                        <div className="flex flex-wrap gap-2">
                          {product.photos.map((url, i) => (
                            <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-[#E5E7EB]" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat */}
                    <ChatBox productId={product.id} currentUser={currentUser} />

                    {/* Decision */}
                    <div className="border border-[#E5E7EB] rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-[#111827] mb-3">Quyết định</h4>
                      <div className="flex gap-3 mb-4">
                        <button
                          onClick={() => updateDecision(product.id, 'decision', 'import')}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                          style={{
                            backgroundColor: d.decision === 'import' ? '#DCFCE7' : '#F3F4F6',
                            color: d.decision === 'import' ? '#16A34A' : '#6B7280',
                            border: d.decision === 'import' ? '2px solid #16A34A' : '2px solid transparent',
                          }}
                        >
                          ✅ Nhập hàng
                        </button>
                        <button
                          onClick={() => updateDecision(product.id, 'decision', 'reject')}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                          style={{
                            backgroundColor: d.decision === 'reject' ? '#FEE2E2' : '#F3F4F6',
                            color: d.decision === 'reject' ? '#DC2626' : '#6B7280',
                            border: d.decision === 'reject' ? '2px solid #DC2626' : '2px solid transparent',
                          }}
                        >
                          ❌ Không nhập
                        </button>
                      </div>

                      {d.decision === 'import' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-[#6B7280] mb-1 block">Người phụ trách</label>
                            <select
                              value={d.assignedBuyerId || ''}
                              onChange={e => updateDecision(product.id, 'assignedBuyerId', e.target.value)}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                            >
                              <option value="">-- Chọn NVMH --</option>
                              {product.assignments.map(a => (
                                <option key={a.user.id} value={a.user.id}>{a.user.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-[#6B7280] mb-1 block">Số lượng nhập</label>
                              <input
                                type="number"
                                value={d.importQty || ''}
                                onChange={e => updateDecision(product.id, 'importQty', e.target.value)}
                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-[#6B7280] mb-1 block">Kho nhập</label>
                              <select
                                value={d.importWarehouse || ''}
                                onChange={e => updateDecision(product.id, 'importWarehouse', e.target.value)}
                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                              >
                                <option value="">-- Chọn kho --</option>
                                <option value="HN">Hà Nội</option>
                                <option value="SG">Sài Gòn</option>
                                <option value="BOTH">Cả hai</option>
                              </select>
                            </div>
                          </div>
                          {totalImport && (
                            <div className="text-sm font-semibold p-3 rounded-lg" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                              Tổng chi phí nhập: {fmt(totalImport)}
                            </div>
                          )}
                        </div>
                      )}

                      {d.decision === 'reject' && (
                        <div>
                          <label className="text-xs font-medium text-[#6B7280] mb-1 block">Lý do từ chối</label>
                          <textarea
                            rows={2}
                            value={d.rejectReason || ''}
                            onChange={e => updateDecision(product.id, 'rejectReason', e.target.value)}
                            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                          />
                        </div>
                      )}

                      <button
                        onClick={() => submitDecision(product)}
                        disabled={saving === product.id || !d.decision}
                        className="w-full mt-3 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                        style={{ backgroundColor: '#E05B28' }}
                      >
                        {saving === product.id ? 'Đang lưu...' : 'Xác nhận quyết định'}
                      </button>
                    </div>
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
