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
  // Limit: 5MB for images, skip large videos
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File quá lớn (tối đa 5MB). Vui lòng cài đặt Vercel Blob để upload video.' }, { status: 413 })
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = file.type || 'image/jpeg'
  return NextResponse.json({ url: `data:${mimeType};base64,${base64}` })
}
