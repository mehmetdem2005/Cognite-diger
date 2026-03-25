import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getUserSupabase(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

async function verifySuperAdmin(token: string) {
  // auth.getUser → service key (güvenilir doğrulama)
  const sb = getServiceSupabase()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  // admins tablosu → kullanıcı token'ı (RLS auth.uid() context'i için)
  const userSb = getUserSupabase(token)
  const { data } = await userSb.from('admins').select('role').eq('user_id', user.id).single()
  return data?.role === 'super_admin' ? user : null
}

// GET /api/admin/settings
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await verifySuperAdmin(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

    // Service role ile sorgula (auth kontrolü zaten yapıldı, GRANT sorunu yok)
    const serviceSb = getServiceSupabase()
    const { data, error } = await serviceSb.from('app_settings').select('*').order('key')
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/admin/settings  { key, value, description? }
export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await verifySuperAdmin(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

    const { key, value, description } = await req.json()
    if (!key || value === undefined) return NextResponse.json({ error: 'key ve value gerekli' }, { status: 400 })

    // Service role ile yaz (auth kontrolü zaten yapıldı)
    const serviceSb = getServiceSupabase()
    const upsertData: Record<string, unknown> = { key, value: String(value), updated_at: new Date().toISOString() }
    if (description !== undefined) upsertData.description = description
    const { error } = await serviceSb.from('app_settings').upsert(upsertData)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
