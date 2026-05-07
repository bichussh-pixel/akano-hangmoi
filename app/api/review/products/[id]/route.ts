import { auth } from '@/lib/auth'
import { saveProduct } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { description } = await req.json()
  await saveProduct(id, { description })
  return NextResponse.json({ ok: true })
}
