import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from './db'
import { ensureOrganization } from './repo'
import {
  deleteCompany,
  ensureCompany,
  linkCompanies,
  listCompanies,
  saveCompany,
  saveWorker,
} from './profiles'

let name: string
let db: BaumCheckDB
beforeEach(() => {
  name = `test-${crypto.randomUUID()}`
  db = new BaumCheckDB(name)
})
afterEach(async () => {
  db.close()
  await Dexie.delete(name)
})

const sub = (n: string, company?: string) => ({
  kind: 'subcontractor' as const,
  name: n,
  company,
  qualifications: [],
  active: true,
})

describe('subcontractor companies', () => {
  it('upgrade from v1 groups free-text companies (case-insensitive)', async () => {
    db.close()
    const v1 = new Dexie(name)
    v1.version(1).stores({ workers: 'id, organizationId, kind, name, syncState' })
    const base = { organizationId: 'o1', createdAt: '', updatedAt: '', syncState: 'pending' }
    await v1.table('workers').bulkAdd([
      { ...base, id: 'w1', ...sub('Karl', 'Kletterteam Süd') },
      { ...base, id: 'w2', ...sub('Kim', ' kletterteam süd') },
      { ...base, id: 'w3', ...sub('Solo') },
      { ...base, id: 'w4', kind: 'employee', name: 'Anna', qualifications: [], active: true },
    ])
    v1.close()

    db = new BaumCheckDB(name)
    const companies = await db.companies.toArray()
    expect(companies.map((c) => c.name)).toEqual(['Kletterteam Süd'])
    const w = await db.workers.bulkGet(['w1', 'w2', 'w3', 'w4'])
    expect(w.map((x) => x?.companyId)).toEqual([
      companies[0]!.id,
      companies[0]!.id,
      undefined,
      undefined,
    ])
    expect(w[1]?.company).toBe('Kletterteam Süd')
  })

  it('renaming a company renames it at its people; deleting keeps the people', async () => {
    const org = await ensureOrganization(db)
    const c = await ensureCompany(db, org.id, 'Kletterteam Süd')
    expect((await ensureCompany(db, org.id, 'KLETTERTEAM SÜD ')).id).toBe(c.id)
    const w = await saveWorker(db, org.id, { ...sub('Karl'), companyId: c.id })
    expect((await db.workers.get(w))?.company).toBe('Kletterteam Süd')

    await saveCompany(db, org.id, { name: 'Kletterteam Nord' }, c.id)
    expect((await db.workers.get(w))?.company).toBe('Kletterteam Nord')

    await deleteCompany(db, c.id)
    expect(await listCompanies(db, org.id)).toEqual([])
    const after = await db.workers.get(w)
    expect([after?.deletedAt, after?.companyId, after?.company]).toEqual([
      undefined,
      undefined,
      undefined,
    ])
  })

  it('saveWorker with a new id creates the record; employees never keep a company', async () => {
    const org = await ensureOrganization(db)
    const c = await ensureCompany(db, org.id, 'Kletterteam Süd')
    await saveWorker(db, org.id, { ...sub('Karl'), companyId: c.id }, 'fixed-id')
    expect((await db.workers.get('fixed-id'))?.company).toBe('Kletterteam Süd')
    await saveWorker(
      db,
      org.id,
      { ...sub('Karl'), kind: 'employee', companyId: c.id, company: 'x' },
      'fixed-id',
    )
    const w = await db.workers.get('fixed-id')
    expect([w?.kind, w?.companyId, w?.company]).toEqual(['employee', undefined, undefined])
  })

  it('linkCompanies reuses existing companies (e.g. after importing an old backup)', async () => {
    const org = await ensureOrganization(db)
    const c = await ensureCompany(db, org.id, 'Kletterteam Süd')
    const w = await saveWorker(db, org.id, sub('Kim', 'kletterteam süd'))
    await linkCompanies(db)
    expect((await db.workers.get(w))?.companyId).toBe(c.id)
    expect(await db.companies.count()).toBe(1)
  })
})
