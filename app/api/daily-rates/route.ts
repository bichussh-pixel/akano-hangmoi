import { auth } from '@/lib/auth'
import { getDailyRate, saveDailyRate } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const today = new Date()
  const rate = await getDailyRate(today)
  return NextResponse.json({ rate })
}

export async function POST(req: Request) {
  const session = await auth()
  const user = session?.user as any
  if (!session || user?.role !== 'LEADER_PM') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { fxRate, intlFreightPerKg } = await req.json()
  await saveDailyRate(new Date(), {
    fxRate: parseFloat(fxRate) || 3400,
    intlFreightPerKg: parseFloat(intlFreightPerKg) || 0,
    createdBy: user.id, createdAt: Date.now(),
  })
  return NextResponse.json({ ok: true })
}
