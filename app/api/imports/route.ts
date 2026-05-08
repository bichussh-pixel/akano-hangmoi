import { auth } from '@/lib/auth'
import { getProducts } from '@/lib/firebase'
import { USERS } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const done = await getProducts({ status: 'done' })
  const products = done
    .sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0))
    .map(p => {
      const buyer = USERS.find(u => u.id === p.assignedBuyerId)
      return {
        id: p.id,
        name: p.name,
        checkCode: p.checkCode,
        totalPerUnit: p.totalPerUnit || 0,
        importQty: p.importQty || 0,
        totalImportCost: p.totalImportCost || 0,
        importWarehouse: p.importWarehouse || '',
        decidedAt: p.decidedAt || 0,
        assignedBuyerId: p.assignedBuyerId || '',
        assignedBuyerName: buyer?.name || '',
      }
    })

  const totalCost = products.reduce((s, p) => s + p.totalImportCost, 0)
  const totalQty  = products.reduce((s, p) => s + p.importQty, 0)

  // NV summary
  const nvMap: Record<string, { name: string; count: number; totalCost: number }> = {}
  for (const p of products) {
    if (!p.assignedBuyerId) continue
    if (!nvMap[p.assignedBuyerId]) nvMap[p.assignedBuyerId] = { name: p.assignedBuyerName, count: 0, totalCost: 0 }
    nvMap[p.assignedBuyerId].count++
    nvMap[p.assignedBuyerId].totalCost += p.totalImportCost
  }
  const nvSummary = Object.entries(nvMap).map(([id, v]) => ({ id, ...v }))

  return NextResponse.json({ products, totalCost, totalQty, nvSummary })
}
