import { auth } from '@/lib/auth'
import { getProduct, saveProduct, generateCheckCode } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { ids } = await req.json()
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: 'No ids' }, { status: 400 })
  }
  const now = new Date()
  const results: { id: string; checkCode: string }[] = []
  for (const id of ids) {
    const product = await getProduct(id)
    if (!product) continue
    // Atomic check code generation via Firebase transaction
    const checkCode = await generateCheckCode(now)
    await saveProduct(id, {
      status: 'pending_setup',
      checkCode,
      approvedAt: Date.now(),
      approvedBy: user.id,
    })
    results.push({ id, checkCode })
  }
  return NextResponse.json({ approved: results })
}
