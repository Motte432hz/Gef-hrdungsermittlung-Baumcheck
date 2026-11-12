import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { listWorkers } from '../../db/profiles'
import { todayLocal } from '../../db/repo'
import { useOrganization } from '../../app/useOrganization'
import { dueItems, type DueItem } from '../../domain/dueDates'
import type { Worker } from '../../domain/types'

/** Deadlines of all people: expired certificates, PPE inspections due. */
export function useDueItems(): { items: DueItem[]; workers: Map<string, Worker> } | undefined {
  const org = useOrganization()
  return useLiveQuery(async () => {
    if (!org) return undefined
    const workers = await listWorkers(db, org.id)
    return {
      items: dueItems(workers, todayLocal()),
      workers: new Map(workers.map((w) => [w.id, w])),
    }
  }, [org?.id])
}
