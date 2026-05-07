import { auth } from '@/lib/auth'
import { getMessages, addMessage } from '@/lib/firebase'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const messages = await getMessages(id)
  return NextResponse.json(messages)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as any
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Empty' }, { status: 400 })
  const msgId = await addMessage(id, {
    senderId: user.id, senderName: user.name || '',
    content: content.trim(), createdAt: Date.now(),
  })
  return NextResponse.json({ id: msgId })
}
