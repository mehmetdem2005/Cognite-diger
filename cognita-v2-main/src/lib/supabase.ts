import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

const hasValidSupabaseUrl = (() => {
  try {
    const url = new URL(supabaseUrl)
    return url.hostname !== 'placeholder.supabase.co' && url.hostname !== 'your-project.supabase.co'
  } catch {
    return false
  }
})()

export const isSupabaseConfigured = hasValidSupabaseUrl
  && supabaseKey !== 'placeholder'
  && supabaseKey !== 'your-anon-key'

export const supabaseConfigError = 'Supabase ayarlari eksik. cognita-v2-main icinde .env.local olusturup .env.example degerlerini gercek anahtarlarla doldur.'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
