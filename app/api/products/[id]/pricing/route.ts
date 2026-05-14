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
    factoryCny,
    // New per-box fields (replaced per-unit weightKg/volumeM3)
    weightKgPerBox, volumeM3PerBox,
    // Legacy per-unit fields (keep accepting for backward compat)
    weightKg, volumeM3,
    domesticFreightCny,
    inspectionCny, inspectionVnd, quarantineCny,
    qtyPerBox, supplierName, supplierContact, moq, leadTime,
    pricingNotes, buyerNotes, videoUrl, freightType,
    // Factory description fields
    factoryMaterial, factoryWeightText, factoryDimensions,
  } = body

  const qty = +qtyPerBox || 1

  // Convert per-box to per-unit for calculation
  const effectiveVolumeM3 = volumeM3PerBox != null
    ? (+volumeM3PerBox || 0) / qty
    : (+volumeM3 || 0)
  const effectiveWeightKg = weightKgPerBox != null
    ? (+weightKgPerBox || 0) / qty
    : (+weightKg || 0)

  // Fetch daily rates for calculation
  const dailyRateDate = product.dailyRateDate
    ? new Date(product.dailyRateDate)
    : new Date()
  const rates = await getDailyRate(dailyRateDate)

  let totalPerUnit = 0, totalPerBox = 0, pricingBreakdown = {}
  if (rates && factoryCny) {
    const result = calculateLandedCost(
      {
        factoryCny: +factoryCny,
        weightKg: effectiveWeightKg,
        volumeM3: effectiveVolumeM3,
        domesticFreightCny: +domesticFreightCny || 0,
        inspectionCny: inspectionCny != null ? +inspectionCny : 0,
        inspectionVnd: inspectionVnd != null ? +inspectionVnd : 0,
        quarantineCny: quarantineCny != null ? +quarantineCny : 0,
        qtyPerBox: qty,
      },
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

  const commonFields = {
    factoryCny: +factoryCny || 0,
    weightKgPerBox: +weightKgPerBox || +weightKg || 0,
    volumeM3PerBox: +volumeM3PerBox || +volumeM3 || 0,
    weightKg: effectiveWeightKg,
    volumeM3: effectiveVolumeM3,
    domesticFreightCny: +domesticFreightCny || 0,
    inspectionVnd: +inspectionVnd || 0,
    quarantineCny: +quarantineCny || 0,
    qtyPerBox: qty,
    totalPerUnit, totalPerBox, pricingBreakdown,
    supplierName: supplierName || '',
    supplierContact: supplierContact || '',
    moq: moq || '',
    leadTime: leadTime || '',
    pricingNotes: pricingNotes || '',
    buyerNotes: buyerNotes || '',
    videoUrl: videoUrl || '',
    freightType: freightType || 'nguyen_xe',
    factoryMaterial: factoryMaterial || '',
    factoryWeightText: factoryWeightText || '',
    factoryDimensions: factoryDimensions || '',
  }

  await saveProduct(id, {
    status: 'pending_final',
    ...commonFields,
    pricedBy: user.id,
    pricedAt: Date.now(),
  })

  const u = getUserById(user.id)
  await savePricing(id, user.id, {
    ...commonFields,
    photos: body.photos || [],
    videos: body.videos || [],
    pricedAt: Date.now(),
    userName: u?.name || user.name || '',
  })

  return NextResponse.json({ totalPerUnit, totalPerBox })
}
