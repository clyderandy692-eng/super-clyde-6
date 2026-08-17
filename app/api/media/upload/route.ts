import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const businessId = String(formData.get('businessId') ?? '').trim()
    const kind = String(formData.get('kind') ?? 'image').trim()

    if (!(file instanceof File) || !businessId) {
      return NextResponse.json({ error: 'Fichier et boutique requis.' }, { status: 400 })
    }

    const isImage = IMAGE_TYPES.has(file.type)
    const isVideo = VIDEO_TYPES.has(file.type)
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Format non pris en charge.' }, { status: 415 })
    }
    if (file.size > maxBytes) {
      return NextResponse.json({ error: `Fichier trop volumineux. Limite : ${isVideo ? '50' : '8'} Mo.` }, { status: 413 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100)
    const pathname = `clyde/${businessId}/${kind}/${crypto.randomUUID()}-${safeName}`
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
      cacheControlMaxAge: 31536000,
    })

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error('[v0] Media upload failed', error)
    return NextResponse.json({ error: 'Le téléversement a échoué.' }, { status: 500 })
  }
}
