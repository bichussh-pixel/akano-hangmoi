import { auth } from '@/lib/auth'
import { fbPush, getProducts } from '@/lib/firebase'
import { NextResponse } from 'next/server'

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
  const existingUrls = new Set(existing.map(p => p.kaloUrl).filter(Boolean))
  let added = 0
  for (const p of kaloProducts) {
    const kaloUrl = p.kaloUrl || p.kalo_url || ''
    if (kaloUrl && existingUrls.has(kaloUrl)) continue
    await fbPush('products', {
      status: 'pending_review', createdAt: Date.now(),
      name: p.name || '', imageUrl: p.imageUrl || p.image_url || '',
      marketPrice: p.market_price || p.price || 0,
      sales30d: p.sales30d || 0, growthRate: p.growth || p.growth_rate || 0,
      kaloUrl, shopUrl: p.shopUrl || p.shop_url || '',
      description: p.description || p.desc || '', category: p.category || p.cat || '',
    })
    added++
  }
  return NextResponse.json({ added })
}
