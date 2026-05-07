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
  if (!session || !['LEADER_PM','ADMIN'].includes(user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { fxRate, intlFreightNguyenXe, intlFreightGhepXe } = await req.json()
  const today = new Date()
  const rate = {
    fxRate:               parseFloat(fxRate)               || 3400,
    intlFreightPerKg:     parseFloat(intlFreightNguyenXe)  || 0,  // backward compat
    intlFreightNguyenXe:  parseFloat(intlFreightNguyenXe)  || 0,
    intlFreightGhepXe:    parseFloat(intlFreightGhepXe)    || 0,
    createdBy: user.id, createdAt: Date.now(),
  }
  await saveDailyRate(today, rate)
  const key = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  return NextResponse.json({ ok: true, rate: { ...rate, key } })
}
