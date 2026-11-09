import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Organization } from '../domain/types'

/** The current organization (live). undefined while loading. */
export function useOrganization(): Organization | undefined {
  return useLiveQuery(async () => {
    const meta = await db.meta.get('currentOrganizationId')
    return meta ? db.organizations.get(meta.value as string) : undefined
  })
}
