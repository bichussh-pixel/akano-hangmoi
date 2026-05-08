import { auth } from '@/lib/auth'
import { getProduct, saveProduct } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { action, decision, assignedBuyerId, importQty, importWarehouse, rejectReason, newPrice } = body

  // Cancel a decided import (e.g. factory didn't ship)
  if (action === 'cancel') {
    await saveProduct(id, {
      status: 'rejected',
      rejectReason: rejectReason || 'Huỷ nhập — xưởng không phát hàng',
      decidedBy: user.id,
      decidedAt: Date.now(),
      // clear import fields
      importQty: 0,
      totalImportCost: 0,
      assignedBuyerId: '',
    })
    return NextResponse.json({ ok: true })
  }

  // Edit price after deciding (factory price changed / NV reported wrong)
  if (action === 'edit_price') {
    const price = Number(newPrice)
    if (!price || price <= 0) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    const qty = product.importQty || 0
    await saveProduct(id, {
      totalPerUnit: price,
      totalImportCost: qty * price,
    })
    return NextResponse.json({ ok: true })
  }

  // Normal decide flow
  if (decision === 'import') {
    const qty = parseInt(importQty) || 0
    const totalImportCost = qty * (product.totalPerUnit || 0)
    await saveProduct(id, {
      status: 'done',
      assignedBuyerId: assignedBuyerId || '',
      importQty: qty,
      importWarehouse: importWarehouse || 'HN',
      totalImportCost,
      decidedBy: user.id,
      decidedAt: Date.now(),
    })
  } else {
    await saveProduct(id, {
      status: 'rejected',
      rejectReason: rejectReason || '',
      decidedBy: user.id,
      decidedAt: Date.now(),
    })
  }
  return NextResponse.json({ ok: true })
}
