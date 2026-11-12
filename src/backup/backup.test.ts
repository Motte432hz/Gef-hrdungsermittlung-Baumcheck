// @vitest-environment node
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../db/db'
import {
  addTree,
  addTreePhoto,
  completeAssessment,
  createAssessment,
  ensureOrganization,
  getProtocolPdf,
  META_DEVICE_CODE,
  setAnswer,
} from '../db/repo'
import { saveWorker } from '../db/profiles'
import { numberingInfo } from '../db/numbering'
import { BackupError, exportBackup, importBackup, META_LAST_BACKUP } from './backup'

const dbs: BaumCheckDB[] = []
const freshDb = () => {
  const db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
  dbs.push(db)
  return db
}
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()))
})

const bytes = (...n: number[]) => new Uint8Array(n).buffer

async function populated() {
  const db = freshDb()
  const org = await ensureOrganization(db, { name: 'Zwieselwiesel', numberPrefix: 'ZW' })
  await db.meta.put({ key: META_DEVICE_CODE, value: 'T1' })
  // Device-only entries that must not travel with a backup.
  await db.meta.put({ key: 'resetCode', value: { salt: '00', hash: '00' } })
  await db.meta.put({ key: 'cloud', value: { organizationId: 'x', userId: 'u', role: 'owner' } })
  await db.meta.put({ key: 'sync:cursor:workers', value: '2030-01-01T00:00:00.000Z' })
  await db.organizations.update(org.id, {
    logo: { type: 'image/png', data: bytes(137, 80, 78, 71) },
  })
  await saveWorker(db, org.id, {
    kind: 'employee',
    name: 'Anna Ast',
    qualifications: [],
    active: true,
    signature: { type: 'image/png', data: bytes(1, 2, 3) },
  })
  const done = await createAssessment(db, org.id, '1.0', { date: '2026-11-09' })
  const t = await addTree(db, done.id)
  await addTreePhoto(db, t.id, { type: 'image/jpeg', data: bytes(255, 216, 255) }, 'baum.jpg')
  await completeAssessment(db, done.id, {
    contentHash: 'c',
    pdf: { type: 'application/pdf', data: bytes(37, 80, 68, 70) },
  })
  const draft = await createAssessment(db, org.id, '1.0', { date: '2026-11-10' })
  await setAnswer(db, draft.id, 'site.address', { value: 'Lindenstraße 4' })
  return { db, org, done, draft, tree: t }
}

describe('backup', () => {
  it('restores everything on a new device, including files', async () => {
    const src = await populated()
    const { zip, summary } = await exportBackup(src.db, '0.1.0')
    expect(summary).toEqual({ assessments: 2, completed: 1, workers: 1, customers: 0, photos: 1 })
    expect((await src.db.meta.get(META_LAST_BACKUP))?.value).toBeTruthy()

    const target = freshDb()
    await ensureOrganization(target) // fresh install creates an empty organization
    const result = await importBackup(target, zip)
    expect(result.added).toBeGreaterThan(5)

    const org = (await target.organizations.toArray())[0]!
    expect(await target.organizations.count()).toBe(1)
    expect(org.id).toBe(src.org.id)
    expect(new Uint8Array(org.logo!.data)).toEqual(new Uint8Array([137, 80, 78, 71]))
    expect(new Uint8Array((await target.workers.toArray())[0]!.signature!.data)).toEqual(
      new Uint8Array([1, 2, 3]),
    )
    const restored = (await target.assessments.get(src.done.id))!
    expect(restored.status).toBe('completed')
    expect(restored.protocolNumber).toBe('ZW-2026-T1-001')
    expect(new Uint8Array((await getProtocolPdf(target, src.done.id))!.file.data)).toEqual(
      new Uint8Array([37, 80, 68, 70]),
    )
    expect((await target.assessments.get(src.draft.id))!.answers['site.address']!.value).toBe(
      'Lindenstraße 4',
    )
    // Device code is device-specific and not copied …
    expect(await target.meta.get(META_DEVICE_CODE)).toBeUndefined()
    for (const key of ['resetCode', 'cloud', 'sync:cursor:workers'])
      expect(await target.meta.get(key)).toBeUndefined()
    // … but number counters are, so numbers are not reused.
    await target.meta.put({ key: META_DEVICE_CODE, value: 'T1' })
    expect((await numberingInfo(target, 'ZW', 2026)).next).toBe('ZW-2026-T1-002')
  })

  it('importing twice changes nothing; completed protocols are never overwritten', async () => {
    const src = await populated()
    const { zip } = await exportBackup(src.db, '0.1.0')
    const again = await importBackup(src.db, zip)
    expect(again.added).toBe(0)
    expect(again.updated).toBe(0)
  })

  it('newer drafts from the backup replace older local drafts', async () => {
    const src = await populated()
    const { zip: oldZip } = await exportBackup(src.db, '0.1.0')
    const target = freshDb()
    await ensureOrganization(target)
    await importBackup(target, oldZip)
    await new Promise((r) => setTimeout(r, 5))
    await setAnswer(src.db, src.draft.id, 'site.address', { value: 'Neue Adresse' })
    const { zip } = await exportBackup(src.db, '0.1.0')
    const r = await importBackup(target, zip)
    expect(r.updated).toBeGreaterThanOrEqual(1)
    expect((await target.assessments.get(src.draft.id))!.answers['site.address']!.value).toBe(
      'Neue Adresse',
    )
  })

  it('refuses a backup of another company on a device in use', async () => {
    const a = await populated()
    const { zip } = await exportBackup(a.db, '0.1.0')
    const other = freshDb()
    const org = await ensureOrganization(other, { name: 'Andere Firma' })
    await createAssessment(other, org.id, '1.0')
    await expect(importBackup(other, zip)).rejects.toThrow('anderen Firma')
  })

  it('rejects files that are not backups', async () => {
    const db = freshDb()
    await expect(importBackup(db, new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(BackupError)
  })
})
