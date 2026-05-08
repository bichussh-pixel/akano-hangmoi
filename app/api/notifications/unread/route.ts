import { auth } from '@/lib/auth'
import { getProducts, getProductsAssignedToUser, getMessages } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let productIds: string[] = []

  if (user.role === 'ADMIN') {
    // ADMIN cares about pending_final products (decide page)
    const products = await getProducts({ status: 'pending_final' })
    productIds = products.map(p => p.id!)
  } else if (['BUYER', 'LEADER_PM'].includes(user.role)) {
    // BUYER/LEADER_PM care about products they're pricing
    const all = await getProducts()
    if (user.role === 'BUYER') {
      const assignedIds = await getProductsAssignedToUser(user.id)
      productIds = all
        .filter(p => ['pricing', 'pending_final'].includes(p.status) && assignedIds.includes(p.id!))
        .map(p => p.id!)
    } else {
      productIds = all.filter(p => p.status === 'pricing').map(p => p.id!)
    }
  }

  if (productIds.length === 0) return NextResponse.json({ count: 0 })

  // Count products with messages in last 2 hours from OTHER users
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
  let count = 0
  for (const pid of productIds) {
    const msgs = await getMessages(pid)
    const hasNew = msgs.some(m => m.createdAt > twoHoursAgo && m.senderId !== user.id)
    if (hasNew) count++
  }

  return NextResponse.json({ count })
}
