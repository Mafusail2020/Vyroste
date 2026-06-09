import { createClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(url: string): string {
  for (const suffix of ['/rest/v1/', '/rest/v1']) {
    if (url.endsWith(suffix)) return url.slice(0, -suffix.length)
  }
  return url.replace(/\/$/, '')
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
