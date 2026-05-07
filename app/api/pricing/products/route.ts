import { auth } from '@/lib/auth'
import { getProducts, getProductsAssignedToUser, getDailyRate } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session || !['BUYER','LEADER_PM'].includes(user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const all = await getProducts({ status: 'pricing' })
  // LEADER_PM thấy tất cả; BUYER chỉ thấy SP được phân công
  let products = all
  if (user.role === 'BUYER') {
    const assignedIds = await getProductsAssignedToUser(user.id)
    products = all.filter(p => assignedIds.includes(p.id!))
  }

  // Enrich each product with its daily rate (for live calc in client)
  const rateCache: Record<string, any> = {}
  const enriched = await Promise.all(products.map(async p => {
    if (!p.dailyRateDate) return p
    if (!rateCache[p.dailyRateDate]) {
      const rate = await getDailyRate(new Date(p.dailyRateDate))
      rateCache[p.dailyRateDate] = rate || null
    }
    return { ...p, dailyRate: rateCache[p.dailyRateDate] }
  }))

  return NextResponse.json(enriched)
}
