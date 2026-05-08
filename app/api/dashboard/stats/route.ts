import { auth } from '@/lib/auth'
import { getProducts, getProductsAssignedToUser } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = await getProducts()

  if (user.role === 'ADMIN') {
    const byStatus = (s: string) => all.filter(p => p.status === s)
    const miniProduct = (p: any) => ({ id: p.id, name: p.name, checkCode: p.checkCode, status: p.status, marketPrice: p.marketPrice, totalPerUnit: p.totalPerUnit, pricedBy: p.pricedBy })
    return NextResponse.json({
      role: 'ADMIN',
      pending_review: byStatus('pending_review').length,
      pending_setup: byStatus('pending_setup').length,
      pricing: byStatus('pricing').length,
      pending_final: byStatus('pending_final').length,
      done: byStatus('done').length,
      rejected: byStatus('rejected').length,
      // Lists for drill-down
      pendingReviewList: byStatus('pending_review').map(miniProduct),
      pendingSetupList: byStatus('pending_setup').map(miniProduct),
      pricingList: byStatus('pricing').map(miniProduct),
      pendingFinalList: byStatus('pending_final').map(miniProduct),
      doneList: byStatus('done').map(miniProduct),
      rejectedList: byStatus('rejected').map(miniProduct),
      recent: all.slice(0, 5),
    })
  }

  if (user.role === 'LEADER_PM') {
    const pendingSetup = all.filter(p => p.status === 'pending_setup')
    return NextResponse.json({
      role: 'LEADER_PM',
      pending_setup: pendingSetup.length,
      pricing: all.filter(p => p.status === 'pricing').length,
    })
  }

  // BUYER
  const assignedIds = await getProductsAssignedToUser(user.id)
  const assigned = all.filter(p => assignedIds.includes(p.id!))
  const needPricing = assigned.filter(p => p.status === 'pricing')
  const alreadyPriced = all.filter(p => p.pricedBy === user.id && ['pending_final','done','rejected'].includes(p.status))
  const decided = alreadyPriced.filter(p => ['done','rejected'].includes(p.status))
  return NextResponse.json({
    role: 'BUYER',
    need_pricing: needPricing.length,
    priced: alreadyPriced.length,
    decided: decided.length,
    total_assigned: assigned.length,
    // Lists for drill-down
    needPricingList: needPricing.map(p => ({ id: p.id, name: p.name, checkCode: p.checkCode, status: p.status, marketPrice: p.marketPrice })),
    pricedList: alreadyPriced.map(p => ({ id: p.id, name: p.name, checkCode: p.checkCode, status: p.status, marketPrice: p.marketPrice, totalPerUnit: p.totalPerUnit })),
    decidedList: decided.map(p => ({ id: p.id, name: p.name, checkCode: p.checkCode, status: p.status, marketPrice: p.marketPrice, totalPerUnit: p.totalPerUnit })),
  })
}
