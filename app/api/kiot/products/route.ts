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
  const all = await getProducts({ status: 'done' })
  const products = all.filter(p => assignedIds.includes(p.id!))
  return NextResponse.json({ products })
}
