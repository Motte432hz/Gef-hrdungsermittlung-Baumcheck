import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getClient } from './client'

export interface CloudUser {
  id: string
  email?: string
}

/** The cloud client and the signed-in user (undefined while loading, null = signed out). */
export function useCloudSession(): { client?: SupabaseClient; user: CloudUser | null | undefined } {
  const [client, setClient] = useState<SupabaseClient>()
  const [user, setUser] = useState<CloudUser | null>()

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    void getClient().then(async (sb) => {
      if (cancelled) return
      setClient(sb)
      const { data } = await sb.auth.getSession()
      if (cancelled) return
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email } : null)
      const sub = sb.auth.onAuthStateChange((_event, session) => {
        const s = session?.user
        setUser(s ? { id: s.id, email: s.email } : null)
      })
      unsubscribe = () => sub.data.subscription.unsubscribe()
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return { client, user }
}
