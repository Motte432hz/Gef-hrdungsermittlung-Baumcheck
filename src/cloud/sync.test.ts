import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../db/db'
import {
  addTree,
  createAssessment,
  ensureOrganization,
  removeTree,
  setTreeAnswer,
} from '../db/repo'
import { saveCustomer, saveWorker } from '../db/profiles'
import { adoptOrganization } from './account'
import { FakeRemote } from './fakeRemote'
import { syncOnce } from './sync'

let a: BaumCheckDB
let b: BaumCheckDB
let server: FakeRemote
beforeEach(() => {
  a = new BaumCheckDB(`a-${crypto.randomUUID()}`)
  b = new BaumCheckDB(`b-${crypto.randomUUID()}`)
  server = new FakeRemote()
})
afterEach(async () => {
  await a.delete()
  await b.delete()
})

/** Device A with a company in the cloud; device B joined it. */
async function twoDevices() {
  const org = await ensureOrganization(a, { name: 'Zwieselwiesel', numberPrefix: 'ZW' })
  server.put('organizations', {
    id: org.id,
    organization_id: org.id,
    created_at: org.createdAt,
    updated_at: '2000-01-01T00:00:00.000Z',
    deleted_at: null,
    data: { name: 'Zwieselwiesel' },
  })
  await ensureOrganization(b)
  await adoptOrganization(b, org.id, 'Zwieselwiesel')
  return org
}

const wait = () => new Promise((r) => setTimeout(r, 5))

describe('sync', () => {
  it('a profile with a file goes from device A to device B', async () => {
    const org = await twoDevices()
    const sig = { type: 'image/png', data: new Uint8Array([1, 2, 3, 4]).buffer }
    const w = await saveWorker(a, org.id, {
      kind: 'employee',
      name: 'Mia',
      qualifications: [{ type: 'skt_a' }],
      signature: sig,
      active: true,
    })
    await a.organizations.update(org.id, {
      logo: { type: 'image/png', data: new Uint8Array([9]).buffer },
    })

    const pushed = await syncOnce(a, org.id, server)
    expect(pushed.pushed).toBeGreaterThanOrEqual(2)
    expect((await a.workers.get(w))?.syncState).toBe('synced')
    expect(server.get('workers', w)?.data.signature).toEqual({
      $file: expect.stringMatching(new RegExp(`^${org.id}/workers/${w}/signature-[0-9a-f]{64}$`)),
      type: 'image/png',
    })

    await syncOnce(b, org.id, server)
    const onB = (await b.workers.get(w))!
    expect([onB.name, onB.syncState, onB.qualifications]).toEqual([
      'Mia',
      'synced',
      [{ type: 'skt_a' }],
    ])
    expect(new Uint8Array(onB.signature!.data)).toEqual(new Uint8Array([1, 2, 3, 4]))
    const orgB = (await b.organizations.get(org.id))!
    expect([orgB.name, orgB.numberPrefix, new Uint8Array(orgB.logo!.data)[0]]).toEqual([
      'Zwieselwiesel',
      'ZW',
      9,
    ])

    // Pulling the same data again downloads nothing.
    const downloads = server.downloads
    await b.meta.clear()
    await syncOnce(b, org.id, server).catch(() => {})
    expect(server.downloads).toBe(downloads)
  })

  it('the newer change wins; an unsent newer local change is kept', async () => {
    const org = await twoDevices()
    const c = await saveCustomer(a, org.id, { name: 'Kita', sites: [] })
    await syncOnce(a, org.id, server)
    await syncOnce(b, org.id, server)

    // B changes first, A later – A's version wins on both devices.
    await b.customers.update(c, { name: 'Kita B' })
    await wait()
    await a.customers.update(c, { name: 'Kita A' })
    await syncOnce(a, org.id, server)
    await syncOnce(b, org.id, server) // B sends its older version (skipped), then gets A's
    expect((await b.customers.get(c))?.name).toBe('Kita A')
    expect(server.get('customers', c)?.data.name).toBe('Kita A')

    // A local change made after the server version is not overwritten by a pull.
    await wait()
    await b.customers.update(c, { name: 'Kita B neu' })
    await syncOnce(b, org.id, server)
    await syncOnce(a, org.id, server)
    expect((await a.customers.get(c))?.name).toBe('Kita B neu')
  })

  it('a change made while sending stays pending', async () => {
    const org = await twoDevices()
    const c = await saveCustomer(a, org.id, { name: 'Kita', sites: [] })
    const upsert = server.upsert.bind(server)
    server.upsert = async (t, rows, o) => {
      await upsert(t, rows, o)
      if (t === 'customers') await a.customers.update(c, { name: 'Kita geändert' })
    }
    await syncOnce(a, org.id, server)
    expect((await a.customers.get(c))?.syncState).toBe('pending')
    server.upsert = upsert
    await syncOnce(a, org.id, server)
    expect(server.get('customers', c)?.data.name).toBe('Kita geändert')
  })

  it('protocols: parts go up before the protocol; deletions are sent and applied', async () => {
    const org = await twoDevices()
    const draft = await createAssessment(a, org.id, '1.0')
    const t1 = await addTree(a, draft.id)
    const t2 = await addTree(a, draft.id)
    await setTreeAnswer(a, t1.id, 'tree.height', { value: 18 })
    const order: string[] = []
    const upsert = server.upsert.bind(server)
    server.upsert = async (t, rows, o) => {
      order.push(t)
      return upsert(t, rows, o)
    }
    await syncOnce(a, org.id, server)
    expect(order.indexOf('trees')).toBeLessThan(order.indexOf('assessments'))
    await syncOnce(b, org.id, server)
    expect(await b.trees.where('assessmentId').equals(draft.id).count()).toBe(2)

    await removeTree(a, t2.id)
    expect(await a.tombstones.count()).toBe(1)
    await syncOnce(a, org.id, server)
    expect(await a.tombstones.count()).toBe(0)
    expect(server.get('trees', t2.id)?.deleted_at).toBeTruthy()
    await syncOnce(b, org.id, server)
    expect(await b.trees.get(t2.id)).toBeUndefined()
    // Applying a deletion from the cloud leaves no tombstone on B.
    expect(await b.tombstones.count()).toBe(0)
    expect((await b.trees.get(t1.id))?.answers['tree.height']?.value).toBe(18)
  })

  it('changes the server does not accept are replaced by the server version', async () => {
    const org = await twoDevices()
    const c = await saveCustomer(a, org.id, { name: 'Kita', sites: [] })
    await syncOnce(a, org.id, server)
    await syncOnce(b, org.id, server)
    const other = await saveCustomer(b, org.id, { name: 'Neu von B', sites: [] })
    await b.customers.update(c, { name: 'Darf ich nicht' })
    server.deny = (t, row) => t === 'customers' && row.id === c
    const r = await syncOnce(b, org.id, server)
    expect(r.rejected).toBe(1)
    expect((await b.customers.get(c))?.name).toBe('Kita')
    expect((await b.customers.get(c))?.syncState).toBe('synced')
    expect(server.get('customers', other)?.data.name).toBe('Neu von B')
  })

  it('a deletion the server refuses is undone on the device', async () => {
    const org = await twoDevices()
    const c = await saveCustomer(a, org.id, { name: 'Kita', sites: [] })
    await syncOnce(a, org.id, server)
    await a.customers.delete(c)
    server.deny = (t) => t === 'customers'
    const r = await syncOnce(a, org.id, server)
    expect(r.rejected).toBe(1)
    expect((await a.customers.get(c))?.name).toBe('Kita')
    expect(await a.tombstones.count()).toBe(0)
  })

  it('a company that only has its summary in the cloud gets safe defaults', async () => {
    const org = await twoDevices()
    await syncOnce(b, org.id, server)
    const o = (await b.organizations.get(org.id))!
    expect([o.name, o.numberPrefix, o.reportEmails, o.updatedAt]).toEqual([
      'Zwieselwiesel',
      'BC',
      [],
      '2000-01-01T00:00:00.000Z',
    ])
  })

  it('records of other companies are never sent', async () => {
    const org = await twoDevices()
    await saveCustomer(a, 'other-org', { name: 'Fremd', sites: [] })
    await syncOnce(a, org.id, server)
    expect(server.rows('customers')).toEqual([])
  })
})
