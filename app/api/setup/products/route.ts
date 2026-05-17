import { auth } from '@/lib/auth'
import { getProducts } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'LEADER_PM') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const products = await getProducts()
  return NextResponse.json(products)
}
