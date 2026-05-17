import { auth } from '@/lib/auth'
import { getProduct, saveProduct, saveActivity } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const { action } = body

  if (action === 'reject') {
    const product = await getProduct(id)
    await saveProduct(id, {
      status: 'rejected',
      rejectReason: body.reason || 'Không duyệt',
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
        meta: { reason: body.reason || 'Không duyệt' },
      })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'update') {
    const { specs, qty, estimatedPrice, photos } = body
    const extra: Record<string, unknown> = {}
    if (specs) {
      extra.specWeight     = specs.weight || ''
      extra.specDimensions = specs.dimensions || ''
      extra.specMaterial   = specs.material || ''
      extra.specUseCases   = specs.useCases || ''
      if (specs.weight)     extra.weightKg      = specs.weight
      if (specs.dimensions) extra.volumeM3      = specs.dimensions
      if (specs.material)   extra.hsDescription = specs.material
      if (specs.useCases)   extra.pricingNotes  = specs.useCases
    }
    if (qty !== undefined && qty !== '') extra.importQty = parseInt(qty) || 0
    if (estimatedPrice !== undefined && estimatedPrice !== '') {
      extra.estimatedImportPrice = parseFloat(estimatedPrice) || 0
    }
    if (photos && photos.length) {
      extra.photos = photos
      extra.imageUrl = photos[0]
    }
    await saveProduct(id, extra)
    return NextResponse.json({ ok: true })
  }

  // Legacy: plain description update
  if (body.description !== undefined) {
    await saveProduct(id, { description: body.description })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
