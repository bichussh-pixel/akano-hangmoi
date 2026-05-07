import { auth } from '@/lib/auth'
import { getProduct, saveProduct, setAssignments, formatDateKey } from '@/lib/firebase'
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
  const { exportTaxPct, importTaxPct, hsCode, hsDescription, assignedUserIds } = body

  const today = formatDateKey(new Date())
  await saveProduct(id, {
    status: 'pricing',
    exportTaxPct: parseFloat(exportTaxPct) || 0,
    importTaxPct: parseFloat(importTaxPct) || 0,
    hsCode: hsCode || '',
    hsDescription: hsDescription || '',
    dailyRateDate: today,
  })

  if (Array.isArray(assignedUserIds) && assignedUserIds.length) {
    await setAssignments(id, assignedUserIds)
  }

  return NextResponse.json({ ok: true })
}
