import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    // Verify user
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    // Ensure avatars bucket exists
    const { data: buckets } = await serviceSupabase.storage.listBuckets()
    const avatarsBucketExists = buckets?.some(b => b.name === 'avatars')
    if (!avatarsBucketExists) {
      await serviceSupabase.storage.createBucket('avatars', { public: true })
    }

    // Parse file from form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })

    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Sadece JPEG, PNG, WebP veya GIF yükleyebilirsiniz' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Dosya boyutu 5MB limitini aşıyor' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
