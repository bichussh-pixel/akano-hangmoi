import { auth } from '@/lib/auth'
import { getProducts } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const products = await getProducts({ status: 'pending_review' })
  return NextResponse.json(products)
}
