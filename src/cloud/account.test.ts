import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../db/db'
import { createAssessment, ensureOrganization, META_CURRENT_ORG } from '../db/repo'
import { saveCustomer, saveWorker } from '../db/profiles'
import { adoptOrganization, cloudErrorMessage } from './account'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  await db.delete()
})

const CLOUD = '11111111-1111-1111-1111-111111111111'

describe('adoptOrganization', () => {
  it('moves drafts, people and customers to the cloud company', async () => {
    const local = await ensureOrganization(db, { name: 'Testfirma' })
    const w = await saveWorker(db, local.id, {
      kind: 'employee',
      name: 'Mia',
      qualifications: [],
      active: true,
    })
    const c = await saveCustomer(db, local.id, { name: 'Kita', sites: [] })
    const a = await createAssessment(db, local.id, '1.0')

    await adoptOrganization(db, CLOUD, 'Zwieselwiesel')

    expect((await db.meta.get(META_CURRENT_ORG))?.value).toBe(CLOUD)
    expect(await db.organizations.get(local.id)).toBeUndefined()
    const org = (await db.organizations.get(CLOUD))!
    expect([org.name, org.updatedAt < '2000']).toEqual(['Zwieselwiesel', true])
    for (const rec of [
      await db.workers.get(w),
      await db.customers.get(c),
      await db.assessments.get(a.id),
    ])
      expect([rec?.organizationId, rec?.syncState]).toEqual([CLOUD, 'pending'])
    // Idempotent.
    await adoptOrganization(db, CLOUD)
    expect((await db.organizations.get(CLOUD))?.name).toBe('Zwieselwiesel')
  })

  it('refuses when completed protocols of another company exist', async () => {
    const local = await ensureOrganization(db)
    const a = await createAssessment(db, local.id, '1.0')
    await db.assessments.update(a.id, { status: 'completed' })
    await expect(adoptOrganization(db, CLOUD)).rejects.toThrow(/abgeschlossene Protokolle/)
    expect((await db.meta.get(META_CURRENT_ORG))?.value).toBe(local.id)
  })
})

describe('cloudErrorMessage', () => {
  it('gives short German messages', () => {
    expect(cloudErrorMessage(new TypeError('Failed to fetch'))).toMatch(/Keine Verbindung/)
    expect(cloudErrorMessage({ message: 'Token has expired or is invalid' })).toMatch(
      /Code ist falsch/,
    )
    expect(cloudErrorMessage({ message: 'email rate limit exceeded' })).toMatch(/Zu viele/)
    expect(cloudErrorMessage({ message: 'Der Code ist ungültig oder abgelaufen.' })).toBe(
      'Der Code ist ungültig oder abgelaufen.',
    )
  })
})
