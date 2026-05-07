import { auth } from '@/lib/auth'
import { BUYERS } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'LEADER_PM') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(
    BUYERS.map(u => ({ id: u.id, name: u.name, email: u.email }))
  )
}
