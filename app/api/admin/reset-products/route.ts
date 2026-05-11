import { auth } from '@/lib/auth'
import { getProducts, fbRemove } from '@/lib/firebase'
import { NextResponse } from 'next/server'

// DELETE /api/admin/reset-products
// Xóa toàn bộ sản phẩm đang chờ duyệt (pending_review) để import lại
export async function DELETE() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const all = await getProducts()
  const products = all.filter(p => p.status === 'pending_review')
  let deleted = 0
  for (const p of products) {
    if (p.id) {
      await fbRemove(`products/${p.id}`)
      deleted++
    }
  }
  return NextResponse.json({ deleted })
}
