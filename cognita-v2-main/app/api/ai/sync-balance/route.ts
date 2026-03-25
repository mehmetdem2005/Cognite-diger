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

async function isSuperAdmin(userId: string, token: string): Promise<boolean> {
  const supabase = getUserSupabase(token)
  const { data } = await supabase
    .from('admins')
    .select('role')
    .eq('user_id', userId)
    .single()
  return data?.role === 'super_admin'
}

// GET /api/ai/sync-balance?provider=deepseek|openai|gemini_paid
// Fetches real balance/usage data from the provider's API
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const serviceSupabase = getServiceSupabase()
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    if (!(await isSuperAdmin(user.id, token))) return NextResponse.json({ error: 'Sadece Süper Admin' }, { status: 403 })

    const provider = req.nextUrl.searchParams.get('provider')

    if (provider === 'deepseek') {
      const apiKey = process.env.DEEPSEEK_API_KEY
      if (!apiKey) return NextResponse.json({ error: 'DEEPSEEK_API_KEY tanımlı değil' }, { status: 500 })

      const res = await fetch('https://api.deepseek.com/user/balance', {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      })

      if (!res.ok) {
        const errText = await res.text()
        return NextResponse.json({ error: `DeepSeek API hatası: ${errText}` }, { status: res.status })
      }

      const data = await res.json()
      // data.balance_infos = [{ currency, total_balance, granted_balance, topped_up_balance }]
      const info = data.balance_infos?.[0]
      return NextResponse.json({
        provider: 'deepseek',
        is_available: data.is_available,
        currency: info?.currency ?? 'CNY',
        total_balance: info?.total_balance ?? '0',
        granted_balance: info?.granted_balance ?? '0',
        topped_up_balance: info?.topped_up_balance ?? '0',
      })
    }

    if (provider === 'openai') {
      // OpenAI doesn't expose credit balance via a simple public API.
      // We return a helpful link instead.
      return NextResponse.json({
        provider: 'openai',
        message: 'OpenAI bakiyesini API üzerinden sorgulama desteklenmiyor.',
        billing_url: 'https://platform.openai.com/settings/organization/billing/overview',
      })
    }

    if (provider === 'gemini_paid') {
      return NextResponse.json({
        provider: 'gemini_paid',
        message: 'Gemini bakiyesini API üzerinden sorgulama desteklenmiyor.',
        billing_url: 'https://console.cloud.google.com/billing',
      })
    }

    return NextResponse.json({ error: 'Bilinmeyen sağlayıcı' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
