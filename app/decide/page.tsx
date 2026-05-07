import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import DecideContent from './DecideContent'

export default async function DecidePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'ADMIN') redirect('/dashboard')

  const user = {
    id: (session.user as any).id,
    name: session.user?.name || '',
    role: (session.user as any).role,
  }

  return (
    <AppLayout>
      <DecideContent currentUser={user} />
    </AppLayout>
  )
}
