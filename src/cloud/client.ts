import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

let client: Promise<SupabaseClient> | undefined

/** The cloud client, loaded on first use (keeps the app start small and offline-friendly). */
export function getClient(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'baumcheck-auth' },
    }),
  )
  return client
}
