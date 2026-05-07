import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import ReviewContent from './ReviewContent'

export default async function ReviewPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'ADMIN') redirect('/dashboard')
  return (
    <AppLayout>
      <ReviewContent />
    </AppLayout>
  )
}
