import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { errorResponse, sanitizeExtension } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rateLimit'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, SAFE_IMAGE_EXTENSIONS, RATE_LIMIT_UPLOAD_MAX, RATE_LIMIT_UPLOAD_WINDOW_MS } from '@/lib/constants'

async function ensureCoversBucket(sb: ReturnType<typeof getServiceSupabase>) {
  const { data: buckets } = await sb.storage.listBuckets()
  if (!buckets?.some((b: { name: string }) => b.name === 'covers')) {
    await sb.storage.createBucket('covers', { public: true })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { allowed } = rateLimit(`cover-upload:${user.id}`, RATE_LIMIT_UPLOAD_MAX, RATE_LIMIT_UPLOAD_WINDOW_MS)
    if (!allowed) return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })

    const sb = getServiceSupabase()
    await ensureCoversBucket(sb)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      return NextResponse.json({ error: 'Sadece JPEG, PNG, WebP veya GIF yükleyebilirsiniz' }, { status: 400 })
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Dosya boyutu 10MB limitini aşıyor' }, { status: 400 })
    }

    const ext = sanitizeExtension(file.name, SAFE_IMAGE_EXTENSIONS)
    const path = `${user.id}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await sb.storage
      .from('covers')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = sb.storage.from('covers').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    return errorResponse(err)
  }
}
