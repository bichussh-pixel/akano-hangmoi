import { auth } from '@/lib/auth'
import { getProducts, getAssignments } from '@/lib/firebase'
import { getUserById } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const products = await getProducts({ status: 'pending_final' })
  // Attach assignment info
  const withAssignments = await Promise.all(products.map(async p => {
    const ids = await getAssignments(p.id!)
    const buyers = ids.map(id => getUserById(id)).filter(Boolean).map(u => ({ id: u!.id, name: u!.name }))
    return { ...p, assignedBuyers: buyers }
  }))
  return NextResponse.json(withAssignments)
}
