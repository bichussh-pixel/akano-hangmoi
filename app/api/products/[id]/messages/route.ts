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
  const body = await req.json()
  const { content, mediaUrl, mediaType } = body
  if (!content?.trim() && !mediaUrl) return NextResponse.json({ error: 'Empty' }, { status: 400 })
  const msgData: any = {
    senderId: user.id, senderName: user.name || '',
    content: (content || '').trim(), createdAt: Date.now(),
  }
  if (mediaUrl) { msgData.mediaUrl = mediaUrl; msgData.mediaType = mediaType || 'image' }
  const msgId = await addMessage(id, msgData)
  return NextResponse.json({ id: msgId })
}
