import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../db/db'
import { ensureOrganization } from '../db/repo'
import { saveDefaultEquipmentPreset, saveWorker } from '../db/profiles'
import { META_LAST_BACKUP } from '../backup/backup'
import { META_CLOUD } from '../cloud/syncManager'
import { setupStatus, suggestPrefix } from './setup'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`setup-${crypto.randomUUID()}`)
})
afterEach(() => db.delete())

describe('setup checklist', () => {
  it('a new installation is fresh, with nothing done', async () => {
    await ensureOrganization(db)
    const s = (await setupStatus(db))!
    expect(s.fresh).toBe(true)
    expect(s.done).toBe(0)
    expect(s.member).toBe(false)
  })

  it('ticks off what has been set up', async () => {
    const org = await ensureOrganization(db, { name: 'Zwieselwiesel', city: 'Freiburg' })
    await saveWorker(db, org.id, {
      kind: 'employee',
      name: 'Mia',
      qualifications: [],
      active: true,
    })
    await saveDefaultEquipmentPreset(db, org.id, { 'equip.ppeAvailable': 'yes' })
    await db.meta.put({ key: META_LAST_BACKUP, value: new Date().toISOString() })
    const s = (await setupStatus(db))!
    const done = s.items.filter((i) => i.done).map((i) => i.id)
    expect(done).toEqual(['company', 'team', 'equipment', 'safety'])
    expect(s.fresh).toBe(false)
  })

  it('members of a cloud company get no checklist', async () => {
    const org = await ensureOrganization(db)
    await db.meta.put({
      key: META_CLOUD,
      value: { organizationId: org.id, userId: 'u', role: 'member' },
    })
    expect((await setupStatus(db))!.member).toBe(true)
  })

  it('suggests a prefix from the company name', () => {
    expect(suggestPrefix('Zwieselwiesel Baumpflege')).toBe('ZB')
    expect(suggestPrefix('Zwieselwiesel')).toBe('ZW')
    expect(suggestPrefix('Müller & Söhne GmbH')).toBe('MS')
    expect(suggestPrefix('')).toBe('')
  })
})
