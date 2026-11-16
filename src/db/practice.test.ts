import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from './db'
import {
  addTree,
  completeAssessment,
  createAssessment,
  deletePractice,
  ensureOrganization,
  peekProtocolNumber,
  PRACTICE_NUMBER,
} from './repo'
import { startAssessment } from '../wizard/start'
import { FakeRemote } from '../cloud/fakeRemote'
import { syncOnce } from '../cloud/sync'
import { queueSend } from '../cloud/outbox'
import { META_CLOUD } from '../cloud/syncManager'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`practice-${crypto.randomUUID()}`)
})
afterEach(() => db.delete())

const pdf = { type: 'application/pdf', data: new Uint8Array([1]).buffer }

describe('practice runs', () => {
  it('start with example answers and are marked as practice', async () => {
    const org = await ensureOrganization(db, { numberPrefix: 'ZW' })
    const a = await startAssessment(db, org.id, { practice: true })
    expect(a.practice).toBe(true)
    expect(a.answers['job.types']?.value).toContain('tree_work')
  })

  it('use no protocol number', async () => {
    const org = await ensureOrganization(db, { numberPrefix: 'ZW' })
    const p = await createAssessment(db, org.id, '1.0', { practice: true })
    expect(await peekProtocolNumber(db, p.id)).toBe(PRACTICE_NUMBER)
    const done = await completeAssessment(db, p.id, { contentHash: 'x', pdf })
    expect(done.protocolNumber).toBe(PRACTICE_NUMBER)
    // The next real protocol still gets number 1.
    const real = await createAssessment(db, org.id, '1.0')
    expect(await peekProtocolNumber(db, real.id)).toMatch(/-0001$/)
  })

  it('can be deleted after completion, with everything that belongs to them', async () => {
    const org = await ensureOrganization(db)
    const p = await createAssessment(db, org.id, '1.0', { practice: true })
    await addTree(db, p.id)
    await completeAssessment(db, p.id, { contentHash: 'x', pdf })
    await deletePractice(db, p.id)
    expect(await db.assessments.get(p.id)).toBeUndefined()
    expect(await db.trees.where('assessmentId').equals(p.id).count()).toBe(0)
    expect(await db.attachments.where('assessmentId').equals(p.id).count()).toBe(0)
    expect(await db.auditLog.where('entityId').equals(p.id).count()).toBe(0)
    expect(await db.tombstones.count()).toBe(0)
  })

  it('refuses to delete a real protocol this way', async () => {
    const org = await ensureOrganization(db)
    const a = await createAssessment(db, org.id, '1.0')
    await expect(deletePractice(db, a.id)).rejects.toThrow()
  })

  it('never reach the cloud and are not sent', async () => {
    const org = await ensureOrganization(db, { name: 'Firma' })
    const server = new FakeRemote()
    server.put('organizations', {
      id: org.id,
      organization_id: org.id,
      created_at: org.createdAt,
      updated_at: '2000-01-01T00:00:00.000Z',
      deleted_at: null,
      data: { name: 'Firma' },
    })
    await db.meta.put({
      key: META_CLOUD,
      value: { organizationId: org.id, userId: 'u', role: 'owner' },
    })
    await db.organizations.update(org.id, { reportEmails: ['buero@example.invalid'] })
    const p = await createAssessment(db, org.id, '1.0', { practice: true })
    const tree = await addTree(db, p.id)
    await completeAssessment(db, p.id, { contentHash: 'x', pdf })
    const real = await createAssessment(db, org.id, '1.0')
    await syncOnce(db, org.id, server)
    expect(server.get('assessments', p.id)).toBeUndefined()
    expect(server.get('trees', tree.id)).toBeUndefined()
    expect(server.rows('attachments')).toHaveLength(0)
    expect(server.get('assessments', real.id)).toBeDefined()
    expect(await queueSend(db, p.id)).toBe(false)
  })
})
