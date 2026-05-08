import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // 1. Try Vercel Blob first (preferred)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import('@vercel/blob')
      const blob = await put(`uploads/${Date.now()}-${file.name}`, file, { access: 'public' })
      return NextResponse.json({ url: blob.url })
    } catch (e) {
      console.error('Blob upload failed:', e)
      // fall through to base64
    }
  }

  // 2. Fallback: base64 data URL (works everywhere, stored in Firebase)
  const isVideo = file.type.startsWith('video/')
  if (isVideo) {
    return NextResponse.json({
      error: 'VIDEO_NO_STORAGE',
      message: 'Chưa cấu hình Vercel Blob. Vui lòng dán link video vào ô "URL video" bên dưới.',
    }, { status: 422 })
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ảnh quá lớn (tối đa 8MB). Vui lòng nén ảnh trước khi tải lên.' }, { status: 413 })
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = file.type || 'image/jpeg'
  return NextResponse.json({ url: `data:${mimeType};base64,${base64}` })
}
