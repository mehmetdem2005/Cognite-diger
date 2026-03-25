import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

function getUserSupabase(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

async function isSuperAdmin(userId: string, token: string): Promise<boolean> {
  // Use the user's own token so RLS auth.uid() context is set correctly
  const supabase = getUserSupabase(token)
  const { data } = await supabase
    .from('admins')
    .select('role')
    .eq('user_id', userId)
    .single()
  return data?.role === 'super_admin'
}

// GET /api/ai/provider-config — returns all provider configs (super_admin only)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const serviceSupabase = getServiceSupabase()
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    if (!(await isSuperAdmin(user.id, token))) return NextResponse.json({ error: 'Sadece Süper Admin' }, { status: 403 })

    const userSupabase = getUserSupabase(token)
    const { data, error } = await userSupabase
      .from('ai_provider_config')
      .select('*')
      .order('priority', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/ai/provider-config — update a provider's settings (super_admin only)
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const serviceSupabase = getServiceSupabase()
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    if (!(await isSuperAdmin(user.id, token))) return NextResponse.json({ error: 'Sadece Süper Admin' }, { status: 403 })

    const body = await req.json()
    const { provider_name, ...updates } = body
    if (!provider_name) return NextResponse.json({ error: 'provider_name gerekli' }, { status: 400 })

    // Only allow safe fields to be updated
    const allowed = ['is_enabled', 'tokens_remaining', 'daily_limit', 'fallback_threshold', 'fallback_to', 'priority', 'model_name']
    const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in updates) safeUpdates[key] = updates[key]
    }

    const userSupabase = getUserSupabase(token)
    const { error } = await userSupabase
      .from('ai_provider_config')
      .update(safeUpdates)
      .eq('provider_name', provider_name)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/ai/provider-config/reset-daily — reset today's counter for a provider
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const serviceSupabase = getServiceSupabase()
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    if (!(await isSuperAdmin(user.id, token))) return NextResponse.json({ error: 'Sadece Süper Admin' }, { status: 403 })

    const { provider_name, tokens_to_add } = await req.json()

    const userSupabase = getUserSupabase(token)

    if (tokens_to_add !== undefined) {
      // Add tokens to paid provider
      const { data: current } = await userSupabase
        .from('ai_provider_config')
        .select('tokens_remaining')
        .eq('provider_name', provider_name)
        .single()

      const newAmount = (current?.tokens_remaining ?? 0) + tokens_to_add
      await userSupabase
        .from('ai_provider_config')
        .update({ tokens_remaining: newAmount, updated_at: new Date().toISOString() })
        .eq('provider_name', provider_name)
    } else {
      // Reset daily counter (for free_limited providers)
      await userSupabase
        .from('ai_provider_config')
        .update({ requests_used_today: 0, last_reset_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
        .eq('provider_name', provider_name)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
