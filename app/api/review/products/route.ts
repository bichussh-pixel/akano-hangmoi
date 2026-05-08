import { auth } from '@/lib/auth'
import { getProducts } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const all = await getProducts()
  // pending_review = needs review; others = already reviewed (read-only)
  const pending = all.filter(p => p.status === 'pending_review')
  const reviewed = all.filter(p => ['pending_setup','pricing','pending_final','done','rejected'].includes(p.status))
  return NextResponse.json({ pending, reviewed })
}
