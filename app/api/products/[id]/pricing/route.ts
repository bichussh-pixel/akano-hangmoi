import { auth } from '@/lib/auth'
import { getProduct, saveProduct, getDailyRate, getAssignments, savePricing, getPricings, saveActivity } from '@/lib/firebase'
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
    factoryCny, weightKg, volumeM3, domesticFreightCny,
    inspectionCny, inspectionVnd, quarantineCny,
    qtyPerBox, supplierName, supplierContact, moq, leadTime,
    pricingNotes, videoUrl, freightType,
  } = body

  // Fetch daily rates for calculation
  const dailyRateDate = product.dailyRateDate
    ? new Date(product.dailyRateDate)
    : new Date()
  const rates = await getDailyRate(dailyRateDate)

  let totalPerUnit = 0, totalPerBox = 0, pricingBreakdown = {}
  if (rates && factoryCny) {
    const result = calculateLandedCost(
      {
        factoryCny: +factoryCny, weightKg: +weightKg || 0, volumeM3: +volumeM3 || 0,
        domesticFreightCny: +domesticFreightCny || 0,
        inspectionCny: inspectionCny != null ? +inspectionCny : 0,
        inspectionVnd: inspectionVnd != null ? +inspectionVnd : 0,
        quarantineCny: quarantineCny != null ? +quarantineCny : 0,
        qtyPerBox: +qtyPerBox || 1,
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

  await saveProduct(id, {
    status: 'pending_final',
    factoryCny: +factoryCny || 0, weightKg: +weightKg || 0,
    volumeM3: +volumeM3 || 0, domesticFreightCny: +domesticFreightCny || 0,
    inspectionVnd: +inspectionVnd || 0, quarantineCny: +quarantineCny || 0,
    qtyPerBox: +qtyPerBox || 1,
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
    inspectionVnd: +inspectionVnd || 0, quarantineCny: +quarantineCny || 0,
    qtyPerBox: +qtyPerBox || 1,
    totalPerUnit, totalPerBox, pricingBreakdown,
    supplierName: supplierName || '', supplierContact: supplierContact || '',
    moq: moq || '', leadTime: leadTime || '', pricingNotes: pricingNotes || '',
    photos: body.photos || [], videoUrl: videoUrl || '', freightType: freightType || 'nguyen_xe',
    pricedAt: Date.now(),
    userName: u?.name || user.name || '',
  })

  await saveActivity({
    type: 'priced',
    productId: id,
    productName: product.name,
    checkCode: product.checkCode,
    userId: user.id,
    userName: u?.name || user.name || user.id,
    timestamp: Date.now(),
    meta: { newPrice: totalPerUnit },
  })

  return NextResponse.json({ totalPerUnit, totalPerBox })
}

// BUYER / LEADER_PM / ADMIN có thể cập nhật lại giá với đầy đủ các trường
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!session || !['BUYER', 'LEADER_PM', 'ADMIN'].includes(user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // BUYER chỉ được sửa sản phẩm mình đã báo giá
  if (user.role === 'BUYER' && product.pricedBy !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await req.json()
  const { factoryCny, qtyPerBox, weightKg, volumeM3, domesticFreightCny, inspectionVnd, quarantineCny } = body
  if (!factoryCny || !qtyPerBox || !volumeM3) {
    return NextResponse.json({ error: 'Thiếu trường bắt buộc' }, { status: 400 })
  }

  // Lấy tỷ giá tương ứng ngày báo giá gốc
  const dailyRateDate = product.dailyRateDate ? new Date(product.dailyRateDate) : new Date()
  const rates = await getDailyRate(dailyRateDate)

  let totalPerUnit = 0, totalPerBox = 0, pricingBreakdown: any = {}
  if (rates) {
    const result = calculateLandedCost(
      {
        factoryCny: +factoryCny,
        weightKg: +weightKg || 0,
        volumeM3: +volumeM3,
        domesticFreightCny: +domesticFreightCny || 0,
        inspectionCny: 0,
        inspectionVnd: +inspectionVnd || 0,
        quarantineCny: +quarantineCny || 0,
        qtyPerBox: +qtyPerBox,
      },
      {
        fxRate: +rates.fxRate,
        intlFreightPerKg: +(rates.intlFreightPerKg || 0),
        intlFreightNguyenXe: rates.intlFreightNguyenXe,
        intlFreightGhepXe: rates.intlFreightGhepXe,
        exportTaxPct: +(product as any).exportTaxPct || 0,
        importTaxPct: +(product as any).importTaxPct || 0,
      },
      (product as any).freightType || 'nguyen_xe'
    )
    totalPerUnit = result.totalPerUnit
    totalPerBox = result.totalPerBox
    pricingBreakdown = result.breakdown
  }

  const importQty = product.importQty || 0
  const totalImportCost = totalPerUnit * (+qtyPerBox) * importQty

  await saveProduct(id, {
    factoryCny: +factoryCny,
    qtyPerBox: +qtyPerBox,
    weightKg: +weightKg || 0,
    volumeM3: +volumeM3,
    domesticFreightCny: +domesticFreightCny || 0,
    inspectionVnd: +inspectionVnd || 0,
    quarantineCny: +quarantineCny || 0,
    totalPerUnit,
    totalPerBox,
    pricingBreakdown,
    totalImportCost,
  })

  // Cập nhật lại pricings collection của user này
  const pricings = await getPricings(id)
  const existing = pricings[user.id]
  if (existing) {
    await savePricing(id, user.id, {
      ...existing,
      factoryCny: +factoryCny,
      qtyPerBox: +qtyPerBox,
      weightKg: +weightKg || 0,
      volumeM3: +volumeM3,
      domesticFreightCny: +domesticFreightCny || 0,
      inspectionVnd: +inspectionVnd || 0,
      quarantineCny: +quarantineCny || 0,
      totalPerUnit,
      totalPerBox,
    })
  }

  await saveActivity({
    type: 'price_updated',
    productId: id,
    productName: product.name,
    checkCode: product.checkCode,
    userId: user.id,
    userName: user.name || user.id,
    timestamp: Date.now(),
    meta: {
      oldPrice: (product as any).totalPerUnit || 0,
      newPrice: totalPerUnit,
      old: {
        factoryCny: (product as any).factoryCny || 0,
        qtyPerBox: (product as any).qtyPerBox || 0,
        weightKg: (product as any).weightKg || 0,
        volumeM3: (product as any).volumeM3 || 0,
        domesticFreightCny: (product as any).domesticFreightCny || 0,
        inspectionVnd: (product as any).inspectionVnd || 0,
        quarantineCny: (product as any).quarantineCny || 0,
        totalPerUnit: (product as any).totalPerUnit || 0,
      },
      new: {
        factoryCny: +factoryCny,
        qtyPerBox: +qtyPerBox,
        weightKg: +weightKg || 0,
        volumeM3: +volumeM3,
        domesticFreightCny: +domesticFreightCny || 0,
        inspectionVnd: +inspectionVnd || 0,
        quarantineCny: +quarantineCny || 0,
        totalPerUnit,
      },
    },
  })

  return NextResponse.json({ ok: true, totalPerUnit, totalPerBox })
}
