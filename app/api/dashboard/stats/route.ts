import { auth } from '@/lib/auth'
import { getProducts, getProductsAssignedToUser } from '@/lib/firebase'
import { USERS } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = await getProducts()

  if (user.role === 'ADMIN') {
    const byStatus = (s: string) => all.filter(p => p.status === s)
    const miniProduct = (p: any) => ({
      id: p.id, name: p.name, checkCode: p.checkCode, status: p.status,
      marketPrice: p.marketPrice, totalPerUnit: p.totalPerUnit, pricedBy: p.pricedBy,
    })

    const doneList = byStatus('done')
    const totalImportCost = doneList.reduce((s, p) => s + (p.totalImportCost || 0), 0)
    const totalImportQty  = doneList.reduce((s, p) => s + (p.importQty || 0), 0)

    // NV mua hàng summary
    const nvMap: Record<string, { name: string; count: number; totalCost: number }> = {}
    for (const p of doneList) {
      if (!p.assignedBuyerId) continue
      if (!nvMap[p.assignedBuyerId]) {
        const u = USERS.find(u => u.id === p.assignedBuyerId)
        nvMap[p.assignedBuyerId] = { name: u?.name || p.assignedBuyerId, count: 0, totalCost: 0 }
      }
      nvMap[p.assignedBuyerId].count++
      nvMap[p.assignedBuyerId].totalCost += (p.totalImportCost || 0)
    }
    const nvImportSummary = Object.entries(nvMap).map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.totalCost - a.totalCost)

    return NextResponse.json({
      role: 'ADMIN',
      pending_review: byStatus('pending_review').length,
      pending_setup: byStatus('pending_setup').length,
      pricing: byStatus('pricing').length,
      pending_final: byStatus('pending_final').length,
      done: doneList.length,
      rejected: byStatus('rejected').length,
      // Import stats
      totalImportCost,
      totalImportQty,
      nvImportSummary,
      // Drill-down lists
      pendingReviewList: byStatus('pending_review').map(miniProduct),
      pendingSetupList:  byStatus('pending_setup').map(miniProduct),
      pricingList:       byStatus('pricing').map(miniProduct),
      pendingFinalList:  byStatus('pending_final').map(miniProduct),
      doneList: doneList.map(p => ({
        ...miniProduct(p),
        importQty: p.importQty || 0,
        totalImportCost: p.totalImportCost || 0,
        assignedBuyerId: p.assignedBuyerId || '',
        assignedBuyerName: USERS.find(u => u.id === p.assignedBuyerId)?.name || '',
        decidedAt: p.decidedAt,
      })),
      rejectedList: byStatus('rejected').map(miniProduct),
      recent: all.slice(0, 5),
    })
  }

  if (user.role === 'LEADER_PM') {
    const miniProduct = (p: any) => ({
      id: p.id, name: p.name, checkCode: p.checkCode, status: p.status,
      marketPrice: p.marketPrice, totalPerUnit: p.totalPerUnit,
    })
    const buyers = USERS.filter(u => u.role === 'BUYER')
    const pendingFinalList = all.filter(p => p.status === 'pending_final')
    const doneList = all.filter(p => p.status === 'done')
    const pricingList = all.filter(p => p.status === 'pricing')
    const pendingSetupList = all.filter(p => p.status === 'pending_setup')

    // Per-buyer pricing progress
    const buyerProgress = await Promise.all(buyers.map(async b => {
      const assignedIds = await getProductsAssignedToUser(b.id)
      const total = assignedIds.length
      const priced = all.filter(p => assignedIds.includes(p.id!) && p.status !== 'pricing' && p.status !== 'pending_setup' && p.status !== 'pending_review').length
      const pending = all.filter(p => assignedIds.includes(p.id!) && p.status === 'pricing').length
      return { id: b.id, name: b.name, total, priced, pending }
    }))

    return NextResponse.json({
      role: 'LEADER_PM',
      pending_setup: pendingSetupList.length,
      pricing: pricingList.length,
      pending_final: pendingFinalList.length,
      done: doneList.length,
      buyerProgress,
      pricingList: pricingList.map(p => ({
        ...miniProduct(p),
        pricedByName: USERS.find(u => u.id === p.pricedBy)?.name || '',
      })),
      pendingFinalList: pendingFinalList.map(miniProduct),
      doneList: doneList.map(p => ({
        ...miniProduct(p),
        assignedBuyerName: USERS.find(u => u.id === p.assignedBuyerId)?.name || '',
        totalImportCost: p.totalImportCost || 0,
        importQty: p.importQty || 0,
      })),
      pendingSetupList: pendingSetupList.map(miniProduct),
      totalImportCost: doneList.reduce((s, p) => s + (p.totalImportCost || 0), 0),
    })
  }

  // BUYER
  const assignedIds = await getProductsAssignedToUser(user.id)
  const assigned = all.filter(p => assignedIds.includes(p.id!))
  const needPricing = assigned.filter(p => p.status === 'pricing')
  const alreadyPriced = all.filter(p => p.pricedBy === user.id && ['pending_final','done','rejected'].includes(p.status))
  const decidedItems = alreadyPriced.filter(p => ['done','rejected'].includes(p.status))
  // Products where this NV is the assignedBuyer (confirmed to buy)
  const myImports = all.filter(p => p.status === 'done' && p.assignedBuyerId === user.id)
  const totalMyImport = myImports.reduce((s, p) => s + (p.totalImportCost || 0), 0)

  return NextResponse.json({
    role: 'BUYER',
    need_pricing: needPricing.length,
    priced: alreadyPriced.length,
    decided: decidedItems.length,
    total_assigned: assigned.length,
    my_imports: myImports.length,
    totalMyImport,
    // Drill-down lists
    needPricingList: needPricing.map(p => ({ id: p.id, name: p.name, checkCode: p.checkCode, status: p.status, marketPrice: p.marketPrice })),
    pricedList: alreadyPriced.map(p => ({ id: p.id, name: p.name, checkCode: p.checkCode, status: p.status, marketPrice: p.marketPrice, totalPerUnit: p.totalPerUnit })),
    decidedList: decidedItems.map(p => ({ id: p.id, name: p.name, checkCode: p.checkCode, status: p.status, marketPrice: p.marketPrice, totalPerUnit: p.totalPerUnit })),
    myImportList: myImports.map(p => ({
      id: p.id, name: p.name, checkCode: p.checkCode,
      totalPerUnit: p.totalPerUnit || 0,
      importQty: p.importQty || 0,
      totalImportCost: p.totalImportCost || 0,
      decidedAt: p.decidedAt,
    })),
  })
}
