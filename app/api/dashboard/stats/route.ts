import { auth } from '@/lib/auth'
import { getProducts, getProductsAssignedToUser } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = await getProducts()

  if (user.role === 'ADMIN') {
    const byStatus = (s: string) => all.filter(p => p.status === s).length
    const doneProducts = all.filter(p => p.status === 'done')
    const totalImport = doneProducts.reduce((s, p) => s + (p.totalImportCost || 0), 0)
    return NextResponse.json({
      role: 'ADMIN',
      pending_review: byStatus('pending_review'),
      pending_setup: byStatus('pending_setup'),
      pricing: byStatus('pricing'),
      pending_final: byStatus('pending_final'),
      done: byStatus('done'),
      rejected: byStatus('rejected'),
      totalImport,
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
  return NextResponse.json({
    role: 'BUYER',
    total_assigned: assigned.length,
    pricing: assigned.filter(p => p.status === 'pricing').length,
    done: assigned.filter(p => p.status === 'done').length,
    pending_kiot: assigned.filter(p => p.status === 'done' && !p.kiotCode).length,
  })
}
