import { supabase } from './supabase'

export type AdminRole = 'super_admin' | 'admin' | 'moderator'

export interface Admin {
  id: string
  user_id: string
  role: AdminRole
  invited_by: string | null
  created_at: string
  profiles?: { full_name: string | null; username: string | null; avatar_url: string | null; email: string }
}

export async function getAdminByUserId(userId: string): Promise<Admin | null> {
  const { data } = await supabase
    .from('admins')
    .select('id, user_id, role, invited_by, created_at')
    .eq('user_id', userId)
    .single()
  return data || null
}

export async function getAllAdmins(): Promise<Admin[]> {
  const { data } = await supabase
    .from('admins')
    .select('*, profiles(full_name, username, avatar_url, email)')
    .order('created_at', { ascending: true })
  return data || []
}

export function canManageCatalog(role: AdminRole): boolean {
  return role === 'super_admin' || role === 'admin'
}

export function canManageAdmins(role: AdminRole): boolean {
  return role === 'super_admin'
}

export function canModerate(role: AdminRole): boolean {
  return true // all roles can moderate
}
