import { auth } from '@/lib/auth'
import { getProducts, getProductsAssignedToUser, getDailyRate } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session || !['BUYER','LEADER_PM'].includes(user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all products once to avoid double reads
  const allProducts = await getProducts()
  const pricing = allProducts.filter(p => p.status === 'pricing')

  let products = pricing
  let pricedProducts: any[] = []

  if (user.role === 'BUYER') {
    const assignedIds = await getProductsAssignedToUser(user.id)
    // Products still needing pricing
    products = pricing.filter(p => assignedIds.includes(p.id!))
    // Products this BUYER already priced (for chat access)
    pricedProducts = allProducts.filter(p =>
      ['pending_final', 'done', 'rejected'].includes(p.status) && p.pricedBy === user.id
    )
  }

  // Enrich pricing-status products with their daily rate (for live calc in client)
  const rateCache: Record<string, any> = {}
  const enriched = await Promise.all(products.map(async p => {
    if (!p.dailyRateDate) return p
    if (!rateCache[p.dailyRateDate]) {
      const rate = await getDailyRate(new Date(p.dailyRateDate))
      rateCache[p.dailyRateDate] = rate || null
    }
    return { ...p, dailyRate: rateCache[p.dailyRateDate] }
  }))

  return NextResponse.json({ products: enriched, pricedProducts })
}
