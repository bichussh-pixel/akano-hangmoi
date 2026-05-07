import { auth } from '@/lib/auth'
import { getProduct, saveProduct, getAssignments } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'BUYER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const assignments = await getAssignments(id)
  if (!assignments.includes(user.id)) {
    return NextResponse.json({ error: 'Not assigned' }, { status: 403 })
  }

  const { kiotCode } = await req.json()
  await saveProduct(id, { kiotCode, kiotCreatedAt: Date.now() })
  return NextResponse.json({ ok: true })
}
