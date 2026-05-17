import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import ActivitiesContent from './ActivitiesContent'

export default async function ActivitiesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <AppLayout>
      <ActivitiesContent />
    </AppLayout>
  )
}
