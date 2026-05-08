import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MobileWrapper from './MobileWrapper'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const user = {
    name: session.user?.name,
    email: session.user?.email,
    role: (session.user as any)?.role,
  }

  return <MobileWrapper user={user}>{children}</MobileWrapper>
}
