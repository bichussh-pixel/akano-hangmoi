import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import SetupContent from './SetupContent'

export default async function SetupPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'LEADER_PM') redirect('/dashboard')
  return (
    <AppLayout>
      <SetupContent />
    </AppLayout>
  )
}
