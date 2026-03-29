import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

/** Create a Supabase client with service role key (server-side only) */
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/** Extract bearer token from request headers */
export function extractToken(req: NextRequest): string | null {
  return req.headers.get('authorization')?.replace('Bearer ', '') || null
}

/** Verify user from bearer token. Returns null if invalid. */
export async function verifyUser(token: string): Promise<User | null> {
  const sb = getServiceSupabase()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return user
}

/** Verify user and return early 401 response if not authenticated */
export async function requireAuth(req: NextRequest): Promise<{ user: User } | NextResponse> {
  const token = extractToken(req)
  if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = await verifyUser(token)
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  return { user }
}

/** Check if the authenticated user is an admin (any role) */
export async function verifyAdmin(token: string): Promise<{ id: string; role: string } | null> {
  const sb = getServiceSupabase()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null

  const { data } = await sb
    .from('admins')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!data) return null
  return { id: data.id, role: data.role }
}

/** Check if the authenticated user is a super admin */
export async function verifySuperAdmin(token: string): Promise<User | null> {
  const sb = getServiceSupabase()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null

  const { data } = await sb
    .from('admins')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return data?.role === 'super_admin' ? user : null
}
