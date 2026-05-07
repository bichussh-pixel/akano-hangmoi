import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import DashboardContent from './DashboardContent'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <AppLayout>
      <DashboardContent />
    </AppLayout>
  )
}
