'use client'

import { useEffect, useState } from 'react'

const KIOT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwfViN6JH0aM8ErkdA4PsPU5qGNVnrmvNV13kegtHkmvG6fQjBEd9RCVyCaL85zfooFJA/exec'

interface Product {
  id: string
  name: string
  checkCode: string
  marketPrice: number
  kiotCode?: string
  kiotCreatedAt?: string
}

export default function KiotContent({ currentUser }: { currentUser: { id: string; name: string } }) {
  const [pending, setPending] = useState<Product[]>([])
  const [done, setDone] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [kiotInputs, setKiotInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    fetch('/api/kiot/products')
      .then(r => r.json())
      .then(data => {
        setPending(data.pending || [])
        setDone(data.done || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function saveKiotCode(product: Product) {
    const code = kiotInputs[product.id]?.trim()
    if (!code) { showToast('Nhập mã Kiot trước'); return }
    setSaving(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}/kiot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kiotCode: code }),
      })
      if (res.ok) {
        const saved = { ...product, kiotCode: code, kiotCreatedAt: new Date().toISOString() }
        setPending(prev => prev.filter(p => p.id !== product.id))
        setDone(prev => [saved, ...prev])
        showToast(`Đã lưu mã Kiot: ${code}`)
      } else {
        showToast('Lỗi khi lưu mã')
      }
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#111827] mb-6">Tạo mã Kiot</h1>
        <div className="space-y-3 animate-pulse">
          {[...Array(2)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] h-24" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-[#111827] text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">🏷️ Tạo mã Kiot</h1>
        <p className="text-[#6B7280] mt-1">Tạo mã sản phẩm trên hệ thống Kiot và lưu lại</p>
      </div>

      {/* Pending */}
      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center mb-6">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-[#6B7280]">Không có sản phẩm nào cần tạo mã Kiot</p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          <h2 className="font-semibold text-[#111827]">Chờ tạo mã ({pending.length})</h2>
          {pending.map(product => (
            <div key={product.id} className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span
                    className="px-2 py-0.5 text-xs font-mono rounded font-semibold mr-2"
                    style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}
                  >
                    {product.checkCode}
                  </span>
                  <h3 className="text-sm font-semibold text-[#111827] mt-1">{product.name}</h3>
                  <p className="text-xs text-[#6B7280]">Giá thị trường: {Math.round(product.marketPrice).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ</p>
                </div>
                <a
                  href={KIOT_SCRIPT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ backgroundColor: '#E05B28' }}
                >
                  🏷️ Tạo mã Kiot
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Dán mã Kiot vào đây..."
                  value={kiotInputs[product.id] || ''}
                  onChange={e => setKiotInputs(prev => ({ ...prev, [product.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#E05B28]"
                />
                <button
                  onClick={() => saveKiotCode(product)}
                  disabled={saving === product.id || !kiotInputs[product.id]?.trim()}
                  className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: '#16A34A' }}
                >
                  {saving === product.id ? 'Đang lưu...' : 'Lưu mã'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#111827] mb-3">Đã tạo mã ({done.length})</h2>
          <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
            {done.map(product => (
              <div key={product.id} className="flex items-center gap-4 p-4">
                <span
                  className="px-2 py-0.5 text-xs font-mono rounded font-semibold"
                  style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}
                >
                  {product.checkCode}
                </span>
                <span className="flex-1 text-sm text-[#111827]">{product.name}</span>
                <span className="text-sm font-mono font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  {product.kiotCode}
                </span>
                {product.kiotCreatedAt && (
                  <span className="text-xs text-[#6B7280]">
                    {new Date(product.kiotCreatedAt).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
