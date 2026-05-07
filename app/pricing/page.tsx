import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import PricingContent from './PricingContent'

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
