import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import KiotContent from './KiotContent'

export default async function KiotPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'BUYER') redirect('/dashboard')

  const user = {
    id: (session.user as any).id,
    name: session.user?.name || '',
  }

  return (
    <AppLayout>
      <KiotContent currentUser={user} />
    </AppLayout>
  )
}
