import { auth } from '@/lib/auth'
import { saveProduct } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { ids, reason } = await req.json()
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: 'No ids' }, { status: 400 })
  }
  for (const id of ids) {
    await saveProduct(id, {
      status: 'rejected',
      rejectReason: reason || 'Không duyệt',
      decidedBy: user.id,
      decidedAt: Date.now(),
    })
  }
  return NextResponse.json({ rejected: ids.length })
}
