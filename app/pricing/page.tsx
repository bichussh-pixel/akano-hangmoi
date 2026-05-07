import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import dynamic from 'next/dynamic'

const PricingContent = dynamic(() => import('./PricingContent'), {
  ssr: false,
  loading: () => (
    <div>
      <h1 className="text-2xl font-bold text-[#111827] mb-6">💰 Check giá</h1>
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2].map(i => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] h-20" />)}
      </div>
    </div>
  ),
})

export default async function PricingPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const role = (session.user as any)?.role
  if (!['BUYER', 'LEADER_PM'].includes(role)) redirect('/dashboard')

  const user = {
    id: String((session.user as any)?.id ?? ''),
    name: String(session.user?.name ?? ''),
    role: String(role ?? ''),
  }

  return (
    <AppLayout>
      <PricingContent currentUser={user} />
    </AppLayout>
  )
}
