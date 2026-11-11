import Dexie, { type EntityTable, type Transaction } from 'dexie'
import type {
  Assessment,
  Attachment,
  AuditEntry,
  Company,
  Customer,
  EquipmentPreset,
  MetaEntry,
  Organization,
  Signature,
  Tree,
  Worker,
} from '../domain/types'
import { canonicalJson } from '../lib/hash'
import { groupCompanies } from './companies'

/** Fields that may still change after an assessment has been completed. */
const LOCKED_MUTABLE_FIELDS = new Set(['status', 'sentAt', 'syncState', 'updatedAt'])

/**
 * Resolves a dotted key path where property names may themselves contain dots
 * (answer keys like "job.types"): tries the longest matching key first.
 */
export function resolvePath(obj: unknown, parts: string[]): unknown {
  if (parts.length === 0) return obj
  if (obj === null || typeof obj !== 'object') return undefined
  const rec = obj as Record<string, unknown>
  for (let i = parts.length; i >= 1; i--) {
    const key = parts.slice(0, i).join('.')
    if (key in rec) {
      const found = resolvePath(rec[key], parts.slice(i))
      if (found !== undefined || i === parts.length) return found
    }
  }
  return undefined
}

/** Tables that are synced with the cloud (local names). */
export const SYNCED_TABLES = [
  'organizations',
  'companies',
  'workers',
  'customers',
  'equipmentPresets',
  'assessments',
  'trees',
  'signatures',
  'attachments',
  'auditLog',
] as const
export type SyncedTable = (typeof SYNCED_TABLES)[number]

/** A record deleted on this device; the deletion still has to reach the cloud. */
export interface Tombstone {
  seq?: number
  table: SyncedTable
  id: string
  organizationId: string
  at: string
}

const REMOTE = Symbol('remote')

/** Marks a transaction as applying data from the cloud (no sync bookkeeping, no locks). */
export function markRemote(tx: Transaction) {
  ;(tx as unknown as Record<symbol, boolean>)[REMOTE] = true
}

function isRemote(tx: Transaction | undefined): boolean {
  const t = tx ?? (Dexie.currentTransaction as Transaction | undefined)
  return !!t && !!(t as unknown as Record<symbol, boolean>)[REMOTE]
}

export class LockedError extends Error {
  constructor(message = 'Das Protokoll ist abgeschlossen und kann nicht mehr geändert werden.') {
    super(message)
    this.name = 'LockedError'
  }
}

export class BaumCheckDB extends Dexie {
  organizations!: EntityTable<Organization, 'id'>
  workers!: EntityTable<Worker, 'id'>
  companies!: EntityTable<Company, 'id'>
  equipmentPresets!: EntityTable<EquipmentPreset, 'id'>
  customers!: EntityTable<Customer, 'id'>
  assessments!: EntityTable<Assessment, 'id'>
  trees!: EntityTable<Tree, 'id'>
  signatures!: EntityTable<Signature, 'id'>
  attachments!: EntityTable<Attachment, 'id'>
  auditLog!: EntityTable<AuditEntry, 'id'>
  meta!: EntityTable<MetaEntry, 'key'>
  tombstones!: EntityTable<Tombstone, 'seq'>

  constructor(name = 'baumcheck') {
    super(name)
    this.version(1).stores({
      organizations: 'id, syncState',
      workers: 'id, organizationId, kind, name, syncState',
      equipmentPresets: 'id, organizationId, syncState',
      customers: 'id, organizationId, name, syncState',
      assessments:
        'id, organizationId, status, protocolNumber, date, customerId, updatedAt, previousVersionId, syncState',
      trees: 'id, assessmentId, organizationId, syncState',
      signatures: 'id, assessmentId, organizationId, syncState',
      attachments: 'id, assessmentId, treeId, kind, organizationId, syncState',
      auditLog: 'id, organizationId, at, entityId, syncState',
      meta: 'key',
    })
    // v2: subcontractor companies as own records; existing free-text companies are grouped.
    this.version(2)
      .stores({
        workers: 'id, organizationId, kind, name, companyId, syncState',
        companies: 'id, organizationId, name, syncState',
      })
      .upgrade(async (tx) => {
        const workers = (await tx.table('workers').toArray()) as Worker[]
        const { companies, links } = groupCompanies(workers, [])
        await tx.table('companies').bulkAdd(companies)
        for (const [id, c] of links)
          await tx.table('workers').update(id, { companyId: c.id, company: c.name })
      })

    // v3: deletions waiting to be sent to the cloud.
    this.version(3).stores({ tombstones: '++seq, organizationId' })

    // Sync bookkeeping: every local change marks the record as pending (and refreshes its
    // timestamp, which decides between two versions); local deletions leave a tombstone.
    for (const name of SYNCED_TABLES) {
      const table = this.table(name)
      table.hook('updating', (mods, _key, _obj, tx) => {
        if (isRemote(tx)) return
        const keys = Object.keys(mods)
        if (keys.every((k) => k === 'syncState')) return
        const extra: Record<string, unknown> = {}
        if (!('syncState' in mods)) extra.syncState = 'pending'
        if (name !== 'auditLog' && !keys.some((k) => k === 'updatedAt'))
          extra.updatedAt = new Date().toISOString()
        return extra
      })
      table.hook('deleting', (key, obj, tx) => {
        if (isRemote(tx)) return
        const rec = obj as { organizationId?: string }
        if (!rec?.organizationId) return
        const tomb: Tombstone = {
          table: name,
          id: String(key),
          organizationId: rec.organizationId,
          at: new Date().toISOString(),
        }
        // Written after the deleting transaction (it does not include this table).
        tx.on('complete', () => void this.tombstones.add(tomb).catch(() => {}))
      })
    }

    // Immutability: once completed, only status/sentAt/sync metadata may change,
    // and the status can never go back to draft.
    this.assessments.hook('updating', (mods, _key, obj, tx) => {
      if (obj.status === 'draft' || isRemote(tx)) return
      // Dexie may report unchanged fields as modifications – also as nested key paths like
      // "answers.job.types.value" – so resolve the path and compare values.
      const forbidden = Object.entries(mods).filter(
        ([k, v]) =>
          !LOCKED_MUTABLE_FIELDS.has(k.split('.')[0]!) &&
          canonicalJson(v) !== canonicalJson(resolvePath(obj, k.split('.'))),
      )
      if (forbidden.length > 0 || (mods as Partial<Assessment>).status === 'draft') {
        throw new LockedError()
      }
    })
    this.assessments.hook('deleting', (_key, obj, tx) => {
      if (obj.status !== 'draft' && !isRemote(tx)) throw new LockedError()
    })
  }
}

export const db = new BaumCheckDB()
