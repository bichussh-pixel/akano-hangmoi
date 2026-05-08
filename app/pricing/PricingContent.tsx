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

interface PricingContentProps {
  currentUser: { id: string; name: string; role: string }
}

export default function PricingContent({ currentUser }: PricingContentProps) {
  const [products, setProducts] = useState<any[]>([])
  const [pricedProducts, setPricedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openChat, setOpenChat] = useState<string | null>(null)

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
                  <p className="text-sm font-semibold text-[#111827] truncate">{product.name}</p>
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
                    onClick={() => setOpenChat(isOpen ? null : product.id)}
                  >
                    <span className="px-2 py-0.5 text-xs font-mono rounded font-semibold shrink-0" style={{ backgroundColor: '#FFF3EE', color: '#E05B28' }}>
                      {product.checkCode}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-[#111827] truncate">{product.name}</span>
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
