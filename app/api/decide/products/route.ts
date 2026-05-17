import { auth } from '@/lib/auth'
import { getProducts, getAssignments, getPricings } from '@/lib/firebase'
import { getUserById, USERS } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const all = await getProducts()
  // Only show in Chốt nhập if NVMH has submitted pricing with totalPerUnit & totalPerBox calculated
  const pendingFinalProducts = all.filter(p =>
    p.status === 'pending_final' &&
    (p.totalPerUnit || 0) > 0 &&
    (p.totalPerBox || 0) > 0
  )
  const doneProducts     = all.filter(p => p.status === 'done')
  const rejectedProducts = all.filter(p => p.status === 'rejected')

  // Enrich pending_final with pricings
  const withPricings = await Promise.all(pendingFinalProducts.map(async p => {
    const ids = await getAssignments(p.id!)
    const buyers = ids.map(id => getUserById(id)).filter(Boolean).map(u => ({ id: u!.id, name: u!.name }))
    const pricingsMap = await getPricings(p.id!)
    let pricings = Object.entries(pricingsMap).map(([userId, pr]) => ({
      ...pr,
      userId,
      userName: pr.userName || getUserById(userId)?.name || userId,
    }))
    if (pricings.length === 0 && p.pricedBy) {
      const u = getUserById(p.pricedBy)
      pricings = [{
        userId: p.pricedBy,
        userName: u?.name || p.pricedBy,
        factoryCny: p.factoryCny || 0,
        weightKg: p.weightKg,
        volumeM3: p.volumeM3 || 0,
        domesticFreightCny: p.domesticFreightCny,
        inspectionCny: p.inspectionCny,
        qtyPerBox: p.qtyPerBox,
        totalPerUnit: p.totalPerUnit || 0,
        totalPerBox: p.totalPerBox,
        pricingBreakdown: p.pricingBreakdown || {},
        supplierName: p.supplierName || '',
        supplierContact: p.supplierContact || '',
        moq: p.moq || '',
        leadTime: p.leadTime || '',
        pricingNotes: p.pricingNotes || '',
        photos: p.photos || [],
        videoUrl: p.videoUrl || '',
        freightType: p.freightType,
        pricedAt: p.pricedAt || Date.now(),
      }]
    }
    return { ...p, assignedBuyers: buyers, pricings }
  }))

  // Enrich decided products with buyer name
  const allUsers = USERS
  const miniDecided = [...doneProducts, ...rejectedProducts].map(p => {
    const buyer = allUsers.find(u => u.id === p.assignedBuyerId)
    return {
      id: p.id,
      name: p.name,
      checkCode: p.checkCode,
      status: p.status,
      totalPerUnit: p.totalPerUnit || 0,
      importQty: p.importQty || 0,
      totalImportCost: p.totalImportCost || 0,
      importWarehouse: p.importWarehouse,
      decidedAt: p.decidedAt,
      assignedBuyerId: p.assignedBuyerId,
      assignedBuyerName: buyer?.name || '',
      rejectReason: p.rejectReason || '',
      factoryCny: (p as any).factoryCny || 0,
      qtyPerBox: (p as any).qtyPerBox || 0,
      weightKg: (p as any).weightKg || 0,
      volumeM3: (p as any).volumeM3 || 0,
      domesticFreightCny: (p as any).domesticFreightCny || 0,
      inspectionVnd: (p as any).inspectionVnd || 0,
      quarantineCny: (p as any).quarantineCny || 0,
    }
  }).sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0))

  return NextResponse.json({ pending: withPricings, decided: miniDecided })
}
