import Dexie, { type EntityTable } from 'dexie'
import type {
  Assessment,
  Attachment,
  AuditEntry,
  Customer,
  EquipmentPreset,
  MetaEntry,
  Organization,
  Signature,
  Tree,
  Worker,
} from '../domain/types'
import { canonicalJson } from '../lib/hash'

/** Fields that may still change after an assessment has been completed. */
const LOCKED_MUTABLE_FIELDS = new Set(['status', 'sentAt', 'syncState', 'updatedAt'])

export class LockedError extends Error {
  constructor(message = 'Das Protokoll ist abgeschlossen und kann nicht mehr geändert werden.') {
    super(message)
    this.name = 'LockedError'
  }
}

export class BaumCheckDB extends Dexie {
  organizations!: EntityTable<Organization, 'id'>
  workers!: EntityTable<Worker, 'id'>
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

    // Immutability: once completed, only status/sentAt/sync metadata may change,
    // and the status can never go back to draft.
    this.assessments.hook('updating', (mods, _key, obj) => {
      if (obj.status === 'draft') return
      // Dexie may report unchanged fields (e.g. arrays) as modifications, so compare values.
      const current = obj as unknown as Record<string, unknown>
      const forbidden = Object.entries(mods).filter(
        ([k, v]) => !LOCKED_MUTABLE_FIELDS.has(k) && canonicalJson(v) !== canonicalJson(current[k]),
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
