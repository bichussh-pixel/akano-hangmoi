import { auth } from '@/lib/auth'
import { getProducts, getProductsAssignedToUser } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'BUYER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const assignedIds = await getProductsAssignedToUser(user.id)
  const [pricing, confirmed] = await Promise.all([
    getProducts({ status: 'pricing' }),
    getProducts({ status: 'done' }),
  ])
  const pending = pricing.filter(p => assignedIds.includes(p.id!))
  const done    = confirmed.filter(p => assignedIds.includes(p.id!))
  return NextResponse.json({ pending, done })
}
