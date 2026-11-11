import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useOnlineStatus } from '../lib/online'
import { getClient } from './client'
import { META_CLOUD, type CloudLink } from './syncManager'

/** Join requests waiting for approval (admins and the owner only, when online). */
export function usePendingRequests(): number {
  const online = useOnlineStatus()
  const link = useLiveQuery(
    async () => (await db.meta.get(META_CLOUD))?.value as CloudLink | undefined,
    [],
  )
  const [count, setCount] = useState(0)
  const org = link && link.role !== 'member' ? link.organizationId : undefined

  useEffect(() => {
    if (!org || !online) return
    let cancelled = false
    void getClient()
      .then((sb) =>
        sb
          .from('memberships')
          .select('user_id', { count: 'exact', head: true })
          .eq('organization_id', org)
          .eq('status', 'pending'),
      )
      .then(({ count: n }) => !cancelled && setCount(n ?? 0))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [org, online])

  return org ? count : 0
}
