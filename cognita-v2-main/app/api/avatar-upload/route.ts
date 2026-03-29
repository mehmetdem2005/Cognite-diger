import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { errorResponse, sanitizeExtension } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rateLimit'
import { ALLOWED_IMAGE_TYPES, MAX_AVATAR_SIZE_BYTES, SAFE_IMAGE_EXTENSIONS, RATE_LIMIT_UPLOAD_MAX, RATE_LIMIT_UPLOAD_WINDOW_MS } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { allowed } = rateLimit(`avatar-upload:${user.id}`, RATE_LIMIT_UPLOAD_MAX, RATE_LIMIT_UPLOAD_WINDOW_MS)
    if (!allowed) return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })

    const serviceSupabase = getServiceSupabase()

    // Ensure avatars bucket exists
    const { data: buckets } = await serviceSupabase.storage.listBuckets()
    const avatarsBucketExists = buckets?.some((b: { name: string }) => b.name === 'avatars')
    if (!avatarsBucketExists) {
      await serviceSupabase.storage.createBucket('avatars', { public: true })
    }

    // Parse file from form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      return NextResponse.json({ error: 'Sadece JPEG, PNG, WebP veya GIF yükleyebilirsiniz' }, { status: 400 })
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return NextResponse.json({ error: 'Dosya boyutu 5MB limitini aşıyor' }, { status: 400 })
    }

    const ext = sanitizeExtension(file.name, SAFE_IMAGE_EXTENSIONS)
    const path = `${user.id}/avatar.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await serviceSupabase.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = serviceSupabase.storage.from('avatars').getPublicUrl(path)

    // Update profile
    await serviceSupabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    return errorResponse(err)
  }
}
