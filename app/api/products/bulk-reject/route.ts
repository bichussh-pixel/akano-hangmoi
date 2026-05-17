import { auth } from '@/lib/auth'
import { getProduct, saveProduct, saveActivity } from '@/lib/firebase'
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
    const product = await getProduct(id)
    await saveProduct(id, {
      status: 'rejected',
      rejectReason: reason || 'Không duyệt',
      decidedBy: user.id,
      decidedAt: Date.now(),
    })
    if (product) {
      await saveActivity({
        type: 'rejected',
        productId: id,
        productName: product.name,
        checkCode: product.checkCode,
        userId: user.id,
        userName: user.name || user.id,
        timestamp: Date.now(),
        meta: { reason: reason || 'Không duyệt' },
      })
    }
  }
  return NextResponse.json({ rejected: ids.length })
}
