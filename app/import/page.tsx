import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import ImportContent from './ImportContent'

export default async function ImportPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'ADMIN') redirect('/dashboard')
  return (
    <AppLayout>
      <ImportContent />
    </AppLayout>
  )
}
