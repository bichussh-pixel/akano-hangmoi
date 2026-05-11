import { auth } from '@/lib/auth'
import { fbPush, getProducts } from '@/lib/firebase'
import { NextResponse } from 'next/server'

const BLOCKED_NAMES = [
  'bột giặt', 'nước giặt', 'nước rửa chén', 'nước lau', 'tẩy rửa',
  'chất tẩy', 'tẩy trắng', 'xà phòng', 'xà bông', 'nước xả vải',
  'nước tẩy', 'kem giặt', 'viên giặt', 'gel giặt',
  'áo thun', 'áo sơ mi', 'áo polo', 'áo khoác', 'áo len',
  'quần jean', 'quần short', 'quần tây', 'quần kaki',
  'váy đầm', 'đầm maxi', 'chân váy', 'set đồ',
  'giày thể thao', 'giày cao gót', 'sandal', 'dép lào', 'sneaker',
  'kem dưỡng', 'serum', 'son môi', 'phấn nền', 'mascara',
  'kem chống nắng', 'sữa rửa mặt', 'tẩy tế bào', 'mặt nạ dưỡng',
]

const BLOCKED_CATS = [
  'hóa chất', 'tinh dầu', 'nước hoa', 'mỹ phẩm',
  'thời trang', 'quần áo', 'trang phục', 'giày dép',
  'túi xách', 'phụ kiện thời trang', 'hóa phẩm', 'tẩy rửa',
]

function isBlocked(p: any): boolean {
  const name = (p.name || '').toLowerCase()
  const cat  = (p.category || p.cat || '').toLowerCase()
  return BLOCKED_NAMES.some(k => name.includes(k)) || BLOCKED_CATS.some(k => cat.includes(k))
}

function normName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

// GET — trả về danh sách tên + URL đã có để UI đánh dấu trùng
export async function GET(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const existing = await getProducts()
  return NextResponse.json({
    names: existing.map(p => normName(p.name || '')).filter(Boolean),
    urls:  existing.map(p => p.kaloUrl || '').filter(Boolean),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { products: kaloProducts } = await req.json()
  if (!Array.isArray(kaloProducts) || !kaloProducts.length) {
    return NextResponse.json({ error: 'No products' }, { status: 400 })
  }
  const existing = await getProducts()
  const existingUrls  = new Set(existing.map(p => p.kaloUrl).filter(Boolean))
  const existingNames = new Set(existing.map(p => normName(p.name || '')).filter(Boolean))

  let added = 0, skippedDup = 0, skippedBlocked = 0
  for (const p of kaloProducts) {
    const kaloUrl = p.kaloUrl || p.kalo_url || ''
    if (kaloUrl && existingUrls.has(kaloUrl)) { skippedDup++; continue }
    if (normName(p.name || '') && existingNames.has(normName(p.name || ''))) { skippedDup++; continue }
    if (isBlocked(p)) { skippedBlocked++; continue }
    await fbPush('products', {
      status: 'pending_review', createdAt: Date.now(),
      name: p.name || '', imageUrl: p.imageUrl || p.image_url || '',
      marketPrice: p.market_price || p.price || 0,
      sales30d: p.sales30d || 0,
      revenue30d: p.revenue30d || 0,
      growthRate: p.growth || p.growth_rate || 0,
      kaloUrl, shopUrl: p.shopUrl || p.shop_url || '',
      description: p.description || p.desc || '', category: p.category || p.cat || '',
    })
    added++
    existingNames.add(normName(p.name || ''))
    if (kaloUrl) existingUrls.add(kaloUrl)
  }
  return NextResponse.json({ added, skippedDup, skippedBlocked })
}
