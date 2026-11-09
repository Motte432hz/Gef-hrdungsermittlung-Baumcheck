import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from './db'
import { ensureOrganization } from './repo'
import {
  deleteCustomer,
  deleteWorker,
  getDefaultEquipmentPreset,
  listCustomers,
  listWorkers,
  saveCustomer,
  saveDefaultEquipmentPreset,
  saveOrganization,
  saveWorker,
  type WorkerInput,
} from './profiles'
import type { Organization } from '../domain/types'

let db: BaumCheckDB
let org: Organization

beforeEach(async () => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
  org = await ensureOrganization(db)
})
afterEach(async () => {
  await db.delete()
})

const worker = (over: Partial<WorkerInput> = {}): WorkerInput => ({
  kind: 'employee',
  name: 'Anna Ast',
  qualifications: [{ type: 'skt_a', validUntil: '2027-05-01' }],
  active: true,
  ...over,
})

describe('organization profile', () => {
  it('saves company data and logo', async () => {
    const logo = { type: 'image/png', data: new Uint8Array([137, 80, 78, 71]).buffer }
    await saveOrganization(db, org.id, {
      name: 'Zwieselwiesel Baumpflege',
      numberPrefix: 'ZW',
      reportEmails: ['buero@example.de'],
      logo,
    })
    const stored = (await db.organizations.get(org.id))!
    expect(stored).toMatchObject({
      name: 'Zwieselwiesel Baumpflege',
      numberPrefix: 'ZW',
      syncState: 'pending',
    })
    expect(stored.logo!.type).toBe('image/png')
    expect(new Uint8Array(stored.logo!.data)).toEqual(new Uint8Array([137, 80, 78, 71]))
    expect(stored.reportEmails).toEqual(['buero@example.de'])
  })
})

describe('workers', () => {
  it('creates, updates and lists by kind, sorted by name', async () => {
    const id = await saveWorker(db, org.id, worker({ name: 'Zora Zweig' }))
    await saveWorker(db, org.id, worker({ name: 'Bernd Borke' }))
    await saveWorker(
      db,
      org.id,
      worker({ name: 'Sub Unternehmer', kind: 'subcontractor', company: 'Kletter GmbH' }),
    )
    await saveWorker(db, org.id, worker({ name: 'Zora Zweig-Müller' }), id)

    expect((await listWorkers(db, org.id, 'employee')).map((w) => w.name)).toEqual([
      'Bernd Borke',
      'Zora Zweig-Müller',
    ])
    expect((await listWorkers(db, org.id, 'subcontractor')).map((w) => w.company)).toEqual([
      'Kletter GmbH',
    ])
    expect(await listWorkers(db, org.id)).toHaveLength(3)
  })

  it('soft-deletes and removes the stored signature', async () => {
    const id = await saveWorker(
      db,
      org.id,
      worker({ signature: { type: 'image/png', data: new Uint8Array([1]).buffer } }),
    )
    expect((await db.workers.get(id))!.signature!.data.byteLength).toBe(1)
    await deleteWorker(db, id)
    expect(await listWorkers(db, org.id)).toEqual([])
    const stored = (await db.workers.get(id))!
    expect(stored.deletedAt).toBeTruthy()
    expect(stored.signature).toBeUndefined()
  })

  it('writes audit entries', async () => {
    const id = await saveWorker(db, org.id, worker())
    await saveWorker(db, org.id, worker({ name: 'Neu' }), id)
    await deleteWorker(db, id)
    const actions = (await db.auditLog.where('entityId').equals(id).toArray())
      .map((e) => e.action)
      .sort()
    expect(actions).toEqual(['created', 'deleted', 'updated'])
  })
})

describe('customers', () => {
  it('saves customers with sites and soft-deletes', async () => {
    const id = await saveCustomer(db, org.id, {
      name: 'Hausverwaltung Müller',
      city: 'Frankfurt',
      sites: [
        {
          id: 's1',
          name: 'Wohnanlage Lindenstraße',
          street: 'Lindenstraße 4',
          postalCode: '60311',
          city: 'Frankfurt',
        },
      ],
    })
    await saveCustomer(db, org.id, { name: 'Ärztehaus', sites: [] })
    expect((await listCustomers(db, org.id)).map((c) => c.name)).toEqual([
      'Ärztehaus',
      'Hausverwaltung Müller',
    ])
    expect((await db.customers.get(id))!.sites[0]!.name).toBe('Wohnanlage Lindenstraße')
    await deleteCustomer(db, id)
    expect((await listCustomers(db, org.id)).map((c) => c.name)).toEqual(['Ärztehaus'])
  })
})

describe('equipment preset', () => {
  it('creates once, then updates the same preset', async () => {
    expect(await getDefaultEquipmentPreset(db, org.id)).toBeUndefined()
    const a = await saveDefaultEquipmentPreset(db, org.id, { 'equip.ppeAvailable': 'yes' })
    const b = await saveDefaultEquipmentPreset(db, org.id, { 'equip.radiosChecked': 'na' })
    expect(a).toBe(b)
    expect((await getDefaultEquipmentPreset(db, org.id))!.answers).toEqual({
      'equip.radiosChecked': 'na',
    })
  })
})
