import { auth } from '@/lib/auth'
import { getProduct, saveProduct } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!session || !['BUYER', 'LEADER_PM', 'ADMIN'].includes(user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'No url' }, { status: 400 })

  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = product.photos || []
  if (!existing.includes(url)) {
    await saveProduct(id, { photos: [...existing, url] })
  }

  return NextResponse.json({ ok: true })
}
