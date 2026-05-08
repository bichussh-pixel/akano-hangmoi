import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import PricingProductContent from './PricingProductContent'

export default async function PricingProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  const role = (session.user as any)?.role
  if (!['BUYER', 'LEADER_PM'].includes(role)) redirect('/dashboard')
  const { id } = await params
  const user = {
    id: String((session.user as any)?.id ?? ''),
    name: String(session.user?.name ?? ''),
    role: String(role ?? ''),
  }
  return (
    <AppLayout>
      <PricingProductContent productId={id} currentUser={user} />
    </AppLayout>
  )
}
