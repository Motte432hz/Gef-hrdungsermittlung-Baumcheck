import type { BaumCheckDB } from './db'
import { audit, baseRecord, nowIso } from './repo'
import type {
  Customer,
  EquipmentPreset,
  ID,
  Organization,
  PersonKind,
  Worker,
} from '../domain/types'

type Editable<T> = Omit<
  T,
  'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncState'
>

export type OrganizationInput = Partial<Editable<Organization>>
export type WorkerInput = Editable<Worker>
export type CustomerInput = Editable<Customer>

export async function saveOrganization(db: BaumCheckDB, id: ID, changes: OrganizationInput) {
  await db.transaction('rw', db.organizations, db.auditLog, async () => {
    await db.organizations.update(id, { ...changes, updatedAt: nowIso(), syncState: 'pending' })
    await audit(db, id, 'updated', 'organization', id)
  })
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'de')

export async function listWorkers(db: BaumCheckDB, organizationId: ID, kind?: PersonKind) {
  const all = await db.workers.where('organizationId').equals(organizationId).toArray()
  return all.filter((w) => !w.deletedAt && (!kind || w.kind === kind)).sort(byName)
}

/** Creates (no id) or updates (id) a worker profile. Returns the id. */
export async function saveWorker(
  db: BaumCheckDB,
  organizationId: ID,
  input: WorkerInput,
  id?: ID,
): Promise<ID> {
  return db.transaction('rw', db.workers, db.auditLog, async () => {
    if (id) {
      await db.workers.update(id, { ...input, updatedAt: nowIso(), syncState: 'pending' })
      await audit(db, organizationId, 'updated', 'worker', id)
      return id
    }
    const worker: Worker = { ...baseRecord(organizationId), ...input }
    await db.workers.add(worker)
    await audit(db, organizationId, 'created', 'worker', worker.id)
    return worker.id
  })
}

/**
 * Soft delete. Past assessments keep their own snapshot of the person,
 * so deleting a profile never changes a finished protocol.
 */
export async function deleteWorker(db: BaumCheckDB, id: ID) {
  await db.transaction('rw', db.workers, db.auditLog, async () => {
    const w = await db.workers.get(id)
    if (!w) return
    const ts = nowIso()
    // The stored signature is personal data and is removed right away.
    await db.workers.update(id, {
      deletedAt: ts,
      updatedAt: ts,
      signature: undefined,
      syncState: 'pending',
    })
    await audit(db, w.organizationId, 'deleted', 'worker', id)
  })
}

export async function listCustomers(db: BaumCheckDB, organizationId: ID) {
  const all = await db.customers.where('organizationId').equals(organizationId).toArray()
  return all.filter((c) => !c.deletedAt).sort(byName)
}

export async function saveCustomer(
  db: BaumCheckDB,
  organizationId: ID,
  input: CustomerInput,
  id?: ID,
): Promise<ID> {
  return db.transaction('rw', db.customers, db.auditLog, async () => {
    if (id) {
      await db.customers.update(id, { ...input, updatedAt: nowIso(), syncState: 'pending' })
      await audit(db, organizationId, 'updated', 'customer', id)
      return id
    }
    const customer: Customer = { ...baseRecord(organizationId), ...input }
    await db.customers.add(customer)
    await audit(db, organizationId, 'created', 'customer', customer.id)
    return customer.id
  })
}

export async function deleteCustomer(db: BaumCheckDB, id: ID) {
  await db.transaction('rw', db.customers, db.auditLog, async () => {
    const c = await db.customers.get(id)
    if (!c) return
    const ts = nowIso()
    await db.customers.update(id, { deletedAt: ts, updatedAt: ts, syncState: 'pending' })
    await audit(db, c.organizationId, 'deleted', 'customer', id)
  })
}

/** Phase 1: one preset per organization ("Standard"). */
export async function getDefaultEquipmentPreset(
  db: BaumCheckDB,
  organizationId: ID,
): Promise<EquipmentPreset | undefined> {
  const all = await db.equipmentPresets.where('organizationId').equals(organizationId).toArray()
  return all.find((p) => !p.deletedAt)
}

export async function saveDefaultEquipmentPreset(
  db: BaumCheckDB,
  organizationId: ID,
  answers: Record<string, string>,
): Promise<ID> {
  return db.transaction('rw', db.equipmentPresets, db.auditLog, async () => {
    const existing = await getDefaultEquipmentPreset(db, organizationId)
    if (existing) {
      await db.equipmentPresets.update(existing.id, {
        answers,
        updatedAt: nowIso(),
        syncState: 'pending',
      })
      await audit(db, organizationId, 'updated', 'equipment', existing.id)
      return existing.id
    }
    const preset: EquipmentPreset = { ...baseRecord(organizationId), name: 'Standard', answers }
    await db.equipmentPresets.add(preset)
    await audit(db, organizationId, 'created', 'equipment', preset.id)
    return preset.id
  })
}
