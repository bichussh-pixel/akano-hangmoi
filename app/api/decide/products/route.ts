import { auth } from '@/lib/auth'
import { getProducts, getAssignments, getPricings } from '@/lib/firebase'
import { getUserById } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const products = await getProducts({ status: 'pending_final' })
  const withPricings = await Promise.all(products.map(async p => {
    const ids = await getAssignments(p.id!)
    const buyers = ids.map(id => getUserById(id)).filter(Boolean).map(u => ({ id: u!.id, name: u!.name }))
    const pricingsMap = await getPricings(p.id!)
    let pricings = Object.entries(pricingsMap).map(([userId, pr]) => ({
      ...pr,
      userId,
      userName: pr.userName || getUserById(userId)?.name || userId,
    }))
    // Fallback: product priced before savePricing was added — synthesize from product fields
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
  return NextResponse.json(withPricings)
}
