import { auth } from '@/lib/auth'
import { getActivities } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const activities = await getActivities(150)
  return NextResponse.json({ activities })
}
