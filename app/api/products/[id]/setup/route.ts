import { auth } from '@/lib/auth'
import { getProduct, saveProduct, setAssignments, formatDateKey, saveActivity } from '@/lib/firebase'
import { getUserById } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'LEADER_PM') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { exportTaxPct, importTaxPct, hsCode, hsDescription, assignedUserIds,
          inspectionVnd, quarantineCny, otherCostAmount, otherCostCurrency, setupNotes } = body

  const today = formatDateKey(new Date())
  await saveProduct(id, {
    status: 'pricing',
    exportTaxPct: parseFloat(exportTaxPct) || 0,
    importTaxPct: parseFloat(importTaxPct) || 0,
    hsCode: hsCode || '',
    hsDescription: hsDescription || '',
    inspectionVnd: parseFloat(inspectionVnd) || 0,
    quarantineCny: parseFloat(quarantineCny) || 0,
    otherCostAmount: parseFloat(otherCostAmount) || 0,
    otherCostCurrency: otherCostCurrency || 'VND',
    setupNotes: setupNotes || '',
    dailyRateDate: today,
  })

  if (Array.isArray(assignedUserIds) && assignedUserIds.length) {
    await setAssignments(id, assignedUserIds)
  }

  const assignedNames = (assignedUserIds || []).map((uid: string) => getUserById(uid)?.name || uid).join(', ')
  await saveActivity({
    type: 'setup',
    productId: id,
    productName: product.name,
    checkCode: product.checkCode,
    userId: user.id,
    userName: user.name || user.id,
    timestamp: Date.now(),
    meta: assignedNames ? { assignedUsers: assignedNames } : {},
  })

  return NextResponse.json({ ok: true })
}
