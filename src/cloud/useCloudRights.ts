import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { META_CLOUD, type CloudLink } from './syncManager'

export interface CloudRights {
  /** This device works for a company in the cloud. */
  cloud: boolean
  role?: CloudLink['role']
  isAdmin: boolean
  isOwner: boolean
  /** May change this record (admins: all; members: own records and own profile). */
  canEdit: (rec?: { id?: string; createdBy?: string }) => boolean
  /**
   * May delete: the owner always; others only their own drafts – and records that never left
   * this device. Without the cloud, everything (the device is its own owner).
   */
  canDelete: (rec: { createdBy?: string } | undefined, kind: 'draft' | 'record') => boolean
}

export function rightsFor(link: CloudLink | undefined): CloudRights {
  const isOwner = !link || link.role === 'owner'
  const isAdmin = !link || link.role !== 'member'
  const mine = (rec?: { createdBy?: string }) => !rec?.createdBy || rec.createdBy === link?.userId
  return {
    cloud: !!link,
    role: link?.role,
    isAdmin,
    isOwner,
    canEdit: (rec) => isAdmin || mine(rec) || (!!rec?.id && rec.id === link?.workerId),
    canDelete: (rec, kind) => isOwner || (kind === 'draft' ? mine(rec) : !rec?.createdBy),
  }
}

export function useCloudRights(): CloudRights {
  const link = useLiveQuery(
    async () => (await db.meta.get(META_CLOUD))?.value as CloudLink | undefined,
    [],
  )
  return rightsFor(link)
}
