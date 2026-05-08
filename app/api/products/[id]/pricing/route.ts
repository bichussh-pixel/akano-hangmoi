import { auth } from '@/lib/auth'
import { getProduct, saveProduct, getDailyRate, getAssignments, savePricing } from '@/lib/firebase'
import { calculateLandedCost } from '@/lib/calc'
import { getUserById } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!session || !['BUYER', 'LEADER_PM'].includes(user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // BUYER phải được phân công; LEADER_PM có thể check bất kỳ SP nào
  if (user.role === 'BUYER') {
    const assignments = await getAssignments(id)
    if (!assignments.includes(user.id)) {
      return NextResponse.json({ error: 'Not assigned' }, { status: 403 })
    }
  }

  const body = await req.json()
  const {
    factoryCny, weightKg, volumeM3, domesticFreightCny, inspectionCny, qtyPerBox,
    supplierName, supplierContact, moq, leadTime, pricingNotes, videoUrl,
    freightType,
  } = body

  // Fetch daily rates for calculation
  const dailyRateDate = product.dailyRateDate
    ? new Date(product.dailyRateDate)
    : new Date()
  const rates = await getDailyRate(dailyRateDate)

  let totalPerUnit = 0, totalPerBox = 0, pricingBreakdown = {}
  if (rates && factoryCny) {
    const result = calculateLandedCost(
      { factoryCny: +factoryCny, weightKg: +weightKg || 0, volumeM3: +volumeM3 || 0, domesticFreightCny: +domesticFreightCny || 0, inspectionCny: +inspectionCny || 0, qtyPerBox: +qtyPerBox || 1 },
      {
        fxRate: +rates.fxRate,
        intlFreightPerKg: +(rates.intlFreightPerKg || 0),
        intlFreightNguyenXe: rates.intlFreightNguyenXe,
        intlFreightGhepXe: rates.intlFreightGhepXe,
        exportTaxPct: +product.exportTaxPct! || 0,
        importTaxPct: +product.importTaxPct! || 0,
      },
      freightType || 'nguyen_xe'
    )
    totalPerUnit = result.totalPerUnit
    totalPerBox = result.totalPerBox
    pricingBreakdown = result.breakdown
  }

  await saveProduct(id, {
    status: 'pending_final',
    factoryCny: +factoryCny || 0, weightKg: +weightKg || 0,
    volumeM3: +volumeM3 || 0, domesticFreightCny: +domesticFreightCny || 0,
    inspectionCny: +inspectionCny || 0, qtyPerBox: +qtyPerBox || 1,
    totalPerUnit, totalPerBox, pricingBreakdown,
    supplierName: supplierName || '', supplierContact: supplierContact || '',
    moq: moq || '', leadTime: leadTime || '', pricingNotes: pricingNotes || '',
    videoUrl: videoUrl || '', freightType: freightType || 'nguyen_xe',
    pricedBy: user.id, pricedAt: Date.now(),
  })

  // Also save to per-NV pricings collection
  const u = getUserById(user.id)
  await savePricing(id, user.id, {
    factoryCny: +factoryCny || 0, weightKg: +weightKg || 0,
    volumeM3: +volumeM3 || 0, domesticFreightCny: +domesticFreightCny || 0,
    inspectionCny: +inspectionCny || 0, qtyPerBox: +qtyPerBox || 1,
    totalPerUnit, totalPerBox, pricingBreakdown,
    supplierName: supplierName || '', supplierContact: supplierContact || '',
    moq: moq || '', leadTime: leadTime || '', pricingNotes: pricingNotes || '',
    photos: body.photos || [], videoUrl: videoUrl || '', freightType: freightType || 'nguyen_xe',
    pricedAt: Date.now(),
    userName: u?.name || user.name || '',
  })

  return NextResponse.json({ totalPerUnit, totalPerBox })
}
