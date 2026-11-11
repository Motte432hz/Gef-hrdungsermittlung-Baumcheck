import Dexie, { type EntityTable } from 'dexie'
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

    // Immutability: once completed, only status/sentAt/sync metadata may change,
    // and the status can never go back to draft.
    this.assessments.hook('updating', (mods, _key, obj) => {
      if (obj.status === 'draft') return
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
    this.assessments.hook('deleting', (_key, obj) => {
      if (obj.status !== 'draft') throw new LockedError()
    })
  }
}

export const db = new BaumCheckDB()
