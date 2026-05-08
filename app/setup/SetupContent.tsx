'use client'

import { useEffect, useState } from 'react'

interface DailyRate {
  id: string
  fxRate: number
  intlFreightPerKg: number
}

interface Product {
  id: string
  name: string
  checkCode: string
  marketPrice: number
  category?: string
  exportTaxPct?: number
  importTaxPct?: number
  hsCode?: string
  hsDescription?: string
}

interface Buyer {
  id: string
  name: string
  email: string
}

export default function SetupContent() {
  const [dailyRate, setDailyRate] = useState<DailyRate | null>(null)
  const [fxRate, setFxRate] = useState('')
  const [freightNguyenXe, setFreightNguyenXe] = useState('')
  const [freightGhepXe,   setFreightGhepXe]   = useState('')
  const [savingRate, setSavingRate] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/daily-rates').then(r => r.json()),
      fetch('/api/setup/products').then(r => r.json()),
      fetch('/api/setup/buyers').then(r => r.json()),
    ]).then(([rateData, productsData, buyersData]) => {
      if (rateData.rate) {
        setDailyRate(rateData.rate)
        setFxRate(String(rateData.rate.fxRate))
        setFreightNguyenXe(String(rateData.rate.intlFreightNguyenXe ?? rateData.rate.intlFreightPerKg ?? ''))
        setFreightGhepXe(String(rateData.rate.intlFreightGhepXe ?? ''))
      }
      setProducts(Array.isArray(productsData) ? productsData : (productsData.products || []))
      setBuyers(Array.isArray(buyersData) ? buyersData : (buyersData.buyers || []))
      setLoading(false)
    })
  }, [])

  async function saveRate() {
    setSavingRate(true)
    try {
      const res = await fetch('/api/daily-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fxRate:               Number(fxRate),
          intlFreightNguyenXe:  Number(freightNguyenXe),
          intlFreightGhepXe:    Number(freightGhepXe),
        }),
      })
      const data = await res.json()
      if (data.rate) setDailyRate(data.rate)  // cập nhật state ngay, không cần GET lại
      showToast('✅ Đã lưu tỷ giá hôm nay')
    } catch {
      showToast('Lỗi khi lưu tỷ giá')
    } finally {
      setSavingRate(false)
    }
  }

  function updateField(productId: string, field: string, value: any) {
    setFormData(prev => ({ ...prev, [productId]: { ...(prev[productId] || {}), [field]: value } }))
  }

  function toggleBuyer(productId: string, buyerId: string) {
    setAssignments(prev => {
      const current = prev[productId] || []
      const next = current.includes(buyerId)
        ? current.filter(id => id !== buyerId)
        : [...current, buyerId]
      return { ...prev, [productId]: next }
    })
  }

  async function saveProduct(product: Product) {
    if (!dailyRate) {
      showToast('Vui lòng lưu tỷ giá trước')
      return
    }
    setSaving(product.id)
    const data = formData[product.id] || {}
    try {
      await fetch(`/api/products/${product.id}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exportTaxPct: data.exportTaxPct ?? product.exportTaxPct ?? 0,
          importTaxPct: data.importTaxPct ?? product.importTaxPct ?? 0,
          hsCode: data.hsCode ?? product.hsCode ?? '',
          hsDescription: data.hsDescription ?? product.hsDescription ?? '',
          dailyRateId: dailyRate.id,
          assignedUserIds: assignments[product.id] || [],
        }),
      })
      setProducts(prev => prev.filter(p => p.id !== product.id))
      showToast(`Đã thiết lập ${product.name}`)
    } catch {
      showToast('Lỗi khi lưu')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#111827] mb-6">Thiết lập check giá</h1>
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
        <h1 className="text-2xl font-bold text-[#111827]">⚙️ Thiết lập check giá</h1>
        <p className="text-[#6B7280] mt-1">Cài tỷ giá, thuế và phân công NVMH</p>
      </div>

      {/* Daily rate form */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-6">
        <h2 className="font-semibold text-[#111827] mb-4">
          📈 Tỷ giá hôm nay
          {dailyRate && <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Đã lưu</span>}
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-[#6B7280] mb-1 block">Tỷ giá CNY → VND</label>
            <input
              type="number"
              value={fxRate}
              onChange={e => setFxRate(e.target.value)}
              placeholder="VD: 3500"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B7280] mb-1 block">🚛 Cước Nguyên Xe (VND/m³)</label>
            <input
              type="number"
              value={freightNguyenXe}
              onChange={e => setFreightNguyenXe(e.target.value)}
              placeholder="VD: 5600000"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B7280] mb-1 block">📦 Cước Ghép Xe (VND/m³)</label>
            <input
              type="number"
              value={freightGhepXe}
              onChange={e => setFreightGhepXe(e.target.value)}
              placeholder="VD: 8500000"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]"
            />
          </div>
        </div>
        <button
          onClick={saveRate}
          disabled={savingRate || !fxRate}
          className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: '#E05B28' }}
        >
          {savingRate ? 'Đang lưu...' : 'Lưu tỷ giá hôm nay'}
        </button>
      </div>

      {/* Products */}
      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-[#6B7280]">Không có sản phẩm nào cần thiết lập</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(product => {
            const isOpen = expanded === product.id
            const data = formData[product.id] || {}
            const assigned = assignments[product.id] || []

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
                  <span className="flex-1 text-sm font-medium text-[#111827]">{product.name}</span>
                  <span className="text-xs text-[#6B7280]">{product.category}</span>
                  <span className="text-[#6B7280]">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[#F3F4F6]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-[#6B7280] mb-1 block">Thuế xuất khẩu (%)</label>
                        <input
                          type="number"
                          defaultValue={product.exportTaxPct ?? 0}
                          onChange={e => updateField(product.id, 'exportTaxPct', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#6B7280] mb-1 block">Thuế nhập khẩu (%)</label>
                        <input
                          type="number"
                          defaultValue={product.importTaxPct ?? 0}
                          onChange={e => updateField(product.id, 'importTaxPct', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#6B7280] mb-1 block">Mã HS</label>
                        <input
                          type="text"
                          defaultValue={product.hsCode || ''}
                          onChange={e => updateField(product.id, 'hsCode', e.target.value)}
                          placeholder="VD: 8516.72.00"
                          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#6B7280] mb-1 block">Mô tả HS</label>
                        <input
                          type="text"
                          defaultValue={product.hsDescription || ''}
                          onChange={e => updateField(product.id, 'hsDescription', e.target.value)}
                          placeholder="Mô tả mã HS..."
                          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-xs font-medium text-[#6B7280] mb-2 block">Phân công NVMH</label>
                      <div className="flex flex-wrap gap-2">
                        {buyers.map(buyer => (
                          <button
                            key={buyer.id}
                            onClick={() => toggleBuyer(product.id, buyer.id)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            style={{
                              backgroundColor: assigned.includes(buyer.id) ? '#E05B28' : '#F3F4F6',
                              color: assigned.includes(buyer.id) ? 'white' : '#6B7280',
                            }}
                          >
                            {buyer.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => saveProduct(product)}
                      disabled={saving === product.id}
                      className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                      style={{ backgroundColor: '#E05B28' }}
                    >
                      {saving === product.id ? 'Đang lưu...' : 'Hoàn tất phân công'}
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
