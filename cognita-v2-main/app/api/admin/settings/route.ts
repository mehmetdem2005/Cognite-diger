import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, extractToken, verifySuperAdmin } from '@/lib/auth'
import { adminSettingsPatchSchema } from '@/lib/validation'
import { errorResponse } from '@/lib/api-utils'

// GET /api/admin/settings
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req)
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await verifySuperAdmin(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

    const serviceSb = getServiceSupabase()
    const { data, error } = await serviceSb.from('app_settings').select('*').order('key')
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    return errorResponse(err)
  }
}

// PATCH /api/admin/settings  { key, value, description? }
export async function PATCH(req: NextRequest) {
  try {
    const token = extractToken(req)
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await verifySuperAdmin(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

    const body = adminSettingsPatchSchema.parse(await req.json())

    const serviceSb = getServiceSupabase()
    const upsertData: Record<string, unknown> = { key: body.key, value: body.value, updated_at: new Date().toISOString() }
    if (body.description !== undefined) upsertData.description = body.description
    const { error } = await serviceSb.from('app_settings').upsert(upsertData)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
