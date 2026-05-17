'use client'

import { useEffect, useState, Component } from 'react'
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

function fmt(n: number) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'
}
function fmtInput(v: string | number): string {
  const digits = String(v ?? '').replace(/\D/g, '')
  if (!digits || digits === '0') return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function stripDots(s: string): string { return s.replace(/\./g, '') }

interface EditForm {
  factoryCny: string; qtyPerBox: string; weightKg: string; volumeM3: string
  domesticFreightCny: string; inspectionVnd: string; quarantineCny: string
}
function initEditForm(p: any): EditForm {
  return {
    factoryCny: p.factoryCny ? String(p.factoryCny) : '',
    qtyPerBox: p.qtyPerBox ? String(p.qtyPerBox) : '',
    weightKg: p.weightKg ? String(p.weightKg) : '',
    volumeM3: p.volumeM3 ? String(p.volumeM3) : '',
    domesticFreightCny: p.domesticFreightCny ? String(p.domesticFreightCny) : '',
    inspectionVnd: p.inspectionVnd ? String(p.inspectionVnd) : '',
    quarantineCny: p.quarantineCny ? String(p.quarantineCny) : '',
  }
}

interface PricingContentProps {
  currentUser: { id: string; name: string; role: string }
}

export default function PricingContent({ currentUser }: PricingContentProps) {
  const [products, setProducts] = useState<any[]>([])
  const [pricedProducts, setPricedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openChat, setOpenChat] = useState<string | null>(null)
  const [editForms, setEditForms] = useState<Record<string, EditForm>>({})
  const [editFormOpen, setEditFormOpen] = useState<Record<string, boolean>>({})
  const [savingEdit, setSavingEdit] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [notifIds, setNotifIds] = useState<Set<string>>(new Set())

  function loadNotifs() {
    fetch('/api/notifications/unread')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.productIds)) setNotifIds(new Set(data.productIds)) })
      .catch(() => {})
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function saveEditPricing(product: any) {
    const form = editForms[product.id]
    if (!form?.factoryCny || !form?.qtyPerBox || !form?.volumeM3) {
      showToast('Vui lòng nhập đủ các trường bắt buộc (*)')
      return
    }
    setSavingEdit(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryCny: form.factoryCny,
          qtyPerBox: form.qtyPerBox,
          weightKg: form.weightKg,
          volumeM3: form.volumeM3,
          domesticFreightCny: form.domesticFreightCny,
          inspectionVnd: stripDots(form.inspectionVnd),
          quarantineCny: form.quarantineCny,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        showToast('✅ Đã cập nhật giá')
        setEditFormOpen(prev => ({ ...prev, [product.id]: false }))
        setPricedProducts(prev => prev.map(p =>
          p.id === product.id ? { ...p, ...form, totalPerUnit: data.totalPerUnit, totalPerBox: data.totalPerBox } : p
        ))
      } else {
        showToast('Lỗi khi cập nhật giá')
      }
    } catch { showToast('Lỗi khi cập nhật giá') }
    finally { setSavingEdit(null) }
  }

  useEffect(() => {
    loadNotifs()
    const interval = setInterval(loadNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/pricing/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data); setPricedProducts([])
        } else {
          setProducts(data.products || []); setPricedProducts(data.pricedProducts || [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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
    <div className="max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">💰 Check giá</h1>
        <p className="text-[#6B7280] mt-1">Chọn mã hàng để báo giá</p>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-[#6B7280]">Không có sản phẩm nào cần check giá</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          <p className="text-xs text-[#6B7280]">{products.length} sản phẩm cần báo giá</p>
          {products.map(product => (
            <a
              key={product.id}
              href={`/pricing/${product.id}`}
              className="block bg-white rounded-xl border border-[#E5E7EB] p-4 hover:border-[#E05B28] hover:shadow-sm transition-all no-underline"
            >
              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 text-xs font-mono rounded font-semibold shrink-0 mt-0.5" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
                  {product.checkCode}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827] truncate">{product.name}</p>
                    {notifIds.has(product.id) && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>💬 Mới</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-[#6B7280]">
                    {product.marketPrice > 0 && <span>💰 {fmt(product.marketPrice)}</span>}
                    {(product.sales30d || 0) > 0 && <span>📦 {(product.sales30d || 0).toLocaleString()} đơn/tháng</span>}
                    {(product.growthRate || 0) > 0 && <span className="text-green-600">+{Number(product.growthRate).toFixed(1)}%</span>}
                    {product.category && <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>{product.category}</span>}
                  </div>
                </div>
                <span className="text-[#E05B28] text-sm font-semibold shrink-0">Báo giá →</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {pricedProducts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#111827] mb-3">📋 Đã báo giá ({pricedProducts.length})</h2>
          <div className="space-y-2">
            {pricedProducts.map(product => {
              const isOpen = openChat === product.id
              return (
                <div key={product.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#FAFAFA]"
                    onClick={() => {
                      setOpenChat(isOpen ? null : product.id)
                      if (!isOpen) setNotifIds(prev => { const s = new Set(prev); s.delete(product.id); return s })
                    }}
                  >
                    <span className="px-2 py-0.5 text-xs font-mono rounded font-semibold shrink-0" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
                      {product.checkCode}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-[#111827] truncate">{product.name}</span>
                    {notifIds.has(product.id) && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>💬 Mới</span>
                    )}
                    {product.totalPerUnit > 0 && (
                      <span className="text-sm font-bold shrink-0" style={{ color: '#E05B28' }}>{fmt(product.totalPerUnit)}/chiếc</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{
                      backgroundColor: product.status === 'done' ? '#DCFCE7' : product.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                      color: product.status === 'done' ? '#16A34A' : product.status === 'rejected' ? '#DC2626' : '#D97706',
                    }}>
                      {product.status === 'done' ? '✅ Đã chốt' : product.status === 'rejected' ? '❌ Từ chối' : '⏳ Chờ chốt'}
                    </span>
                    <span className="text-[#6B7280] ml-1 shrink-0">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <SafeBox>
                      <div className="px-5 pb-5 border-t border-[#F3F4F6] pt-4 space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-[#6B7280] font-semibold">✏️ Cập nhật giá</p>
                            <button
                              onClick={() => {
                                if (!editForms[product.id]) setEditForms(prev => ({ ...prev, [product.id]: initEditForm(product) }))
                                setEditFormOpen(prev => ({ ...prev, [product.id]: !prev[product.id] }))
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-semibold"
                              style={{ backgroundColor: editFormOpen[product.id] ? '#DBEAFE' : '#FFF3EE', color: editFormOpen[product.id] ? '#1D4ED8' : '#E05B28' }}>
                              {editFormOpen[product.id] ? '▲ Đóng' : '✏️ Sửa giá'}
                            </button>
                          </div>
                          {editFormOpen[product.id] && (
                            <div className="p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA]">
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                {[
                                  { key: 'factoryCny', label: 'Giá xuất xưởng (¥/chiếc) *', type: 'number', step: '0.01' },
                                  { key: 'qtyPerBox', label: 'Số lượng/thùng (chiếc) *', type: 'number', step: '1' },
                                  { key: 'weightKg', label: 'Cân nặng/thùng (kg)', type: 'number', step: '0.01' },
                                  { key: 'volumeM3', label: 'Số khối/thùng (m³) *', type: 'number', step: '0.001' },
                                  { key: 'domesticFreightCny', label: 'Cước nội địa TQ (¥/chiếc)', type: 'number', step: '0.01' },
                                  { key: 'quarantineCny', label: 'Phí kiểm dịch (¥/chiếc)', type: 'number', step: '0.01' },
                                ].map(({ key, label, type, step }) => (
                                  <div key={key}>
                                    <label className="text-[10px] text-[#6B7280] mb-0.5 block">{label}</label>
                                    <input
                                      type={type} step={step} min="0"
                                      value={(editForms[product.id] as any)?.[key] ?? ''}
                                      onChange={e => setEditForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || initEditForm(product)), [key]: e.target.value } }))}
                                      className="w-full px-2 py-1 border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#E05B28]" />
                                  </div>
                                ))}
                                <div>
                                  <label className="text-[10px] text-[#6B7280] mb-0.5 block">Phí kiểm định (₫/chiếc)</label>
                                  <input
                                    type="text"
                                    value={fmtInput(editForms[product.id]?.inspectionVnd ?? '')}
                                    onChange={e => setEditForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || initEditForm(product)), inspectionVnd: stripDots(e.target.value) } }))}
                                    className="w-full px-2 py-1 border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#E05B28]" />
                                </div>
                              </div>
                              <button
                                onClick={() => saveEditPricing(product)}
                                disabled={savingEdit === product.id}
                                className="w-full py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                                style={{ backgroundColor: '#E05B28' }}>
                                {savingEdit === product.id ? '⏳ Đang tính...' : '💾 Tính & Lưu'}
                              </button>
                            </div>
                          )}
                        </div>
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
