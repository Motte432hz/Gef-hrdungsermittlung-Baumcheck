import type { BaumCheckDB } from './db'
import { audit, baseRecord, nowIso } from './repo'
import { groupCompanies, sameCompanyName } from './companies'
import type {
  Company,
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
export type CompanyInput = Editable<Company>

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

/**
 * Creates or updates a worker profile (an `id` that does not exist yet creates the record with
 * that id – used by forms that save automatically). Returns the id. The company name is taken
 * from the company record; own employees never belong to a subcontractor company.
 */
export async function saveWorker(
  db: BaumCheckDB,
  organizationId: ID,
  input: WorkerInput,
  id?: ID,
): Promise<ID> {
  return db.transaction('rw', db.workers, db.companies, db.auditLog, async () => {
    const data: WorkerInput = { ...input }
    if (data.kind === 'employee') {
      data.companyId = undefined
      data.company = undefined
    } else if (data.companyId) {
      data.company = (await db.companies.get(data.companyId))?.name ?? data.company
    }
    if (id && (await db.workers.get(id))) {
      await db.workers.update(id, { ...data, updatedAt: nowIso(), syncState: 'pending' })
      await audit(db, organizationId, 'updated', 'worker', id)
      return id
    }
    const worker: Worker = { ...baseRecord(organizationId), ...(id ? { id } : {}), ...data }
    await db.workers.add(worker)
    await audit(db, organizationId, 'created', 'worker', worker.id)
    return worker.id
  })
}

export async function listCompanies(db: BaumCheckDB, organizationId: ID) {
  const all = await db.companies.where('organizationId').equals(organizationId).toArray()
  return all.filter((c) => !c.deletedAt).sort(byName)
}

/** Creates or updates a subcontractor company; a new name is copied to its people. */
export async function saveCompany(
  db: BaumCheckDB,
  organizationId: ID,
  input: CompanyInput,
  id?: ID,
): Promise<ID> {
  return db.transaction('rw', db.companies, db.workers, db.auditLog, async () => {
    const ts = nowIso()
    if (id && (await db.companies.get(id))) {
      await db.companies.update(id, { ...input, updatedAt: ts, syncState: 'pending' })
      await db.workers
        .where('companyId')
        .equals(id)
        .modify({ company: input.name, updatedAt: ts, syncState: 'pending' })
      await audit(db, organizationId, 'updated', 'company', id)
      return id
    }
    const company: Company = { ...baseRecord(organizationId), ...(id ? { id } : {}), ...input }
    await db.companies.add(company)
    await audit(db, organizationId, 'created', 'company', company.id)
    return company.id
  })
}

/** The company with this name (case-insensitive) – created if it does not exist yet. */
export async function ensureCompany(db: BaumCheckDB, organizationId: ID, name: string) {
  const found = (await listCompanies(db, organizationId)).find((c) => sameCompanyName(c.name, name))
  if (found) return found
  const id = await saveCompany(db, organizationId, { name: name.trim() })
  return (await db.companies.get(id))!
}

/** Soft delete; its people stay as subcontractors without a company. */
export async function deleteCompany(db: BaumCheckDB, id: ID) {
  await db.transaction('rw', db.companies, db.workers, db.auditLog, async () => {
    const c = await db.companies.get(id)
    if (!c) return
    const ts = nowIso()
    await db.companies.update(id, { deletedAt: ts, updatedAt: ts, syncState: 'pending' })
    await db.workers
      .where('companyId')
      .equals(id)
      .modify({ companyId: undefined, company: undefined, updatedAt: ts, syncState: 'pending' })
    await audit(db, c.organizationId, 'deleted', 'company', id)
  })
}

/** Links subcontractors that only have a free-text company (e.g. from an old backup). */
export async function linkCompanies(db: BaumCheckDB) {
  await db.transaction('rw', db.companies, db.workers, async () => {
    const { companies, links } = groupCompanies(
      await db.workers.toArray(),
      (await db.companies.toArray()).filter((c) => !c.deletedAt),
    )
    await db.companies.bulkAdd(companies)
    for (const [id, c] of links) await db.workers.update(id, { companyId: c.id, company: c.name })
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
