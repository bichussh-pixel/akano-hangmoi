import { auth } from '@/lib/auth'
import { getProduct, saveProduct, generateCheckCode } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { ids, specs, qtys, photos, estimatedPrices } = await req.json()
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
    const extra: Record<string, unknown> = {}
    if (specs?.[id]) {
      if (specs[id].weight)     extra.weightKg    = specs[id].weight
      if (specs[id].dimensions) extra.volumeM3    = specs[id].dimensions
      if (specs[id].material)   extra.hsDescription = specs[id].material
      if (specs[id].useCases)   extra.pricingNotes = specs[id].useCases
      // Also store raw spec strings for display
      extra.specWeight     = specs[id].weight || ''
      extra.specDimensions = specs[id].dimensions || ''
      extra.specMaterial   = specs[id].material || ''
      extra.specUseCases   = specs[id].useCases || ''
    }
    if (qtys?.[id]) extra.importQty = parseInt(qtys[id]) || 0
    if (estimatedPrices?.[id]) extra.estimatedImportPrice = parseFloat(estimatedPrices[id]) || 0
    if (photos?.[id]?.length) {
      extra.photos = photos[id]
      extra.imageUrl = photos[id][0]  // first photo becomes main image
    }
    await saveProduct(id, {
      status: 'pending_setup',
      checkCode,
      approvedAt: Date.now(),
      approvedBy: user.id,
      ...extra,
    })
    results.push({ id, checkCode })
  }
  return NextResponse.json({ approved: results })
}
