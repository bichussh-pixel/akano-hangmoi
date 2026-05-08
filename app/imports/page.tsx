import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import ImportsContent from './ImportsContent'

export default async function ImportsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'ADMIN') redirect('/dashboard')

  return (
    <AppLayout>
      <ImportsContent />
    </AppLayout>
  )
}
