import { auth } from '@/lib/auth'
import { getProducts } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'BUYER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Only show products where Bích explicitly chose this NV as the buyer (assignedBuyerId)
  const all = await getProducts({ status: 'done' })
  const mine = all.filter(p => p.assignedBuyerId === user.id)
  const pending = mine.filter(p => !p.kiotCode)
  const done    = mine.filter(p => !!p.kiotCode)
  return NextResponse.json({ pending, done })
}
