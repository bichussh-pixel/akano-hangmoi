import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const user = {
    name: session.user?.name,
    email: session.user?.email,
    role: (session.user as any)?.role,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F4F6]">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
