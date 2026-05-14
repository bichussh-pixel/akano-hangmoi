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
  const { action, decision, assignedBuyerId, importQtyHN, importQtySG, rejectReason, newPrice } = body

  // Cancel a decided import
  if (action === 'cancel') {
    await saveProduct(id, {
      status: 'rejected',
      rejectReason: rejectReason || 'Huỷ nhập — xưởng không phát hàng',
      decidedBy: user.id,
      decidedAt: Date.now(),
      importQty: 0,
      importQtyHN: 0,
      importQtySG: 0,
      totalImportCost: 0,
      totalImportCostHN: 0,
      totalImportCostSG: 0,
      assignedBuyerId: '',
    })
    return NextResponse.json({ ok: true })
  }

  // Edit price after deciding — record in log
  if (action === 'edit_price') {
    const price = Number(newPrice)
    if (!price || price <= 0) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    const oldPrice = product.totalPerUnit || 0
    const qtyHN = product.importQtyHN || 0
    const qtySG = product.importQtySG || 0
    const totalQty = product.importQty || (qtyHN + qtySG)
    const pricePerBox = price * (product.qtyPerBox || 1)
    const existing = product.priceEditLog || []
    await saveProduct(id, {
      totalPerUnit: price,
      totalImportCost: totalQty * pricePerBox,
      totalImportCostHN: qtyHN * pricePerBox,
      totalImportCostSG: qtySG * pricePerBox,
      priceEditLog: [
        ...existing,
        { oldPrice, newPrice: price, editedBy: user.id, editedAt: Date.now() },
      ],
    })
    return NextResponse.json({ ok: true })
  }

  // Normal decide flow
  if (decision === 'import') {
    const qtyHN = parseInt(importQtyHN || '0') || 0
    const qtySG = parseInt(importQtySG || '0') || 0
    const totalQty = qtyHN + qtySG
    const pricePerBox = (product.totalPerUnit || 0) * (product.qtyPerBox || 1)
    const totalCostHN = qtyHN * pricePerBox
    const totalCostSG = qtySG * pricePerBox
    const totalImportCost = totalCostHN + totalCostSG

    const warehouse = qtyHN > 0 && qtySG > 0 ? 'BOTH' : qtyHN > 0 ? 'HN' : 'SG'

    await saveProduct(id, {
      status: 'done',
      assignedBuyerId: assignedBuyerId || '',
      importQty: totalQty,
      importQtyHN: qtyHN,
      importQtySG: qtySG,
      importWarehouse: warehouse,
      totalImportCost,
      totalImportCostHN: totalCostHN,
      totalImportCostSG: totalCostSG,
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
