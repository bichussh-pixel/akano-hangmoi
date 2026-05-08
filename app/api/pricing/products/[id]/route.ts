import { auth } from '@/lib/auth'
import { getProduct, getDailyRate, getProductsAssignedToUser } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!session || !['BUYER', 'LEADER_PM'].includes(user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const product = await getProduct(id)
  if (!product || product.status !== 'pricing') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (user.role === 'BUYER') {
    const assignedIds = await getProductsAssignedToUser(user.id)
    if (!assignedIds.includes(id)) {
      return NextResponse.json({ error: 'Not assigned' }, { status: 403 })
    }
  }
  if (product.dailyRateDate) {
    const rate = await getDailyRate(new Date(product.dailyRateDate))
    if (rate) return NextResponse.json({ ...product, dailyRate: rate })
  }
  return NextResponse.json(product)
}
