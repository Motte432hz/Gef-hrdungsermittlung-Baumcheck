import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB, LockedError } from './db'
import {
  addTree,
  completeAssessment,
  createAssessment,
  createNewVersion,
  ensureOrganization,
  getTrees,
  markSent,
  META_DEVICE_CODE,
  removeTree,
  setAnswer,
  setTreeAnswer,
  updateAssessment,
} from './repo'
import type { Organization } from '../domain/types'

let db: BaumCheckDB
let org: Organization

beforeEach(async () => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
  org = await ensureOrganization(db, { name: 'Zwieselwiesel', numberPrefix: 'ZW' })
})

afterEach(async () => {
  await db.delete()
})

const complete = (id: string) => completeAssessment(db, id, { contentHash: 'abc' })

describe('organization', () => {
  it('is created once and reused', async () => {
    const again = await ensureOrganization(db, { name: 'Andere' })
    expect(again.id).toBe(org.id)
    expect(again.name).toBe('Zwieselwiesel')
    expect(org.organizationId).toBe(org.id)
    expect(await db.organizations.count()).toBe(1)
  })
})

describe('drafts', () => {
  it('creates a draft with sync metadata and an audit entry', async () => {
    const a = await createAssessment(db, org.id, '1.0', { date: '2026-11-09' })
    expect(a).toMatchObject({
      status: 'draft',
      version: 1,
      organizationId: org.id,
      syncState: 'pending',
      formVersion: '1.0',
    })
    const log = await db.auditLog.toArray()
    expect(log).toEqual([expect.objectContaining({ action: 'created', entityId: a.id })])
  })

  it('stores and removes answers', async () => {
    const a = await createAssessment(db, org.id, '1.0')
    await setAnswer(db, a.id, 'team.briefed', { value: 'yes' })
    await setAnswer(db, a.id, 'site.powerLines', { value: 'present', note: 'Freischaltung' })
    await setAnswer(db, a.id, 'team.briefed', undefined)
    expect((await db.assessments.get(a.id))!.answers).toEqual({
      'site.powerLines': { value: 'present', note: 'Freischaltung' },
    })
  })

  it('manages trees with contiguous indexes', async () => {
    const a = await createAssessment(db, org.id, '1.0')
    const t1 = await addTree(db, a.id)
    const t2 = await addTree(db, a.id)
    const t3 = await addTree(db, a.id)
    await setTreeAnswer(db, t3.id, 'tree.species', { value: 'Linde' })
    await removeTree(db, t2.id)
    const trees = await getTrees(db, a.id)
    expect(trees.map((t) => [t.id, t.index])).toEqual([
      [t1.id, 0],
      [t3.id, 1],
    ])
    expect(trees[1]!.answers['tree.species']!.value).toBe('Linde')
  })
})

describe('completion and protocol numbers', () => {
  it('assigns sequential numbers per year', async () => {
    const a = await createAssessment(db, org.id, '1.0', { date: '2026-11-09' })
    const b = await createAssessment(db, org.id, '1.0', { date: '2026-11-10' })
    const c = await createAssessment(db, org.id, '1.0', { date: '2027-01-02' })
    // Numbers are assigned on completion, not on creation.
    expect((await complete(b.id)).protocolNumber).toBe('ZW-2026-0001')
    expect((await complete(a.id)).protocolNumber).toBe('ZW-2026-0002')
    expect((await complete(c.id)).protocolNumber).toBe('ZW-2027-0001')
  })

  it('uses the device code when configured', async () => {
    await db.meta.put({ key: META_DEVICE_CODE, value: 'T2' })
    const a = await createAssessment(db, org.id, '1.0', { date: '2026-11-09' })
    expect((await complete(a.id)).protocolNumber).toBe('ZW-2026-T2-001')
  })

  it('stores hashes and logs completion', async () => {
    const a = await createAssessment(db, org.id, '1.0', { date: '2026-11-09' })
    await completeAssessment(db, a.id, {
      contentHash: 'c0ffee',
      pdfHash: 'beef',
      deviceInfo: 'iPhone',
    })
    const stored = (await db.assessments.get(a.id))!
    expect(stored).toMatchObject({
      status: 'completed',
      contentHash: 'c0ffee',
      pdfHash: 'beef',
      deviceInfo: 'iPhone',
    })
    expect(stored.completedAt).toBeTruthy()
    const actions = (await db.auditLog.toArray()).map((e) => e.action).sort()
    expect(actions).toEqual(['completed', 'created'])
  })

  it('a completed protocol cannot be completed again', async () => {
    const a = await createAssessment(db, org.id, '1.0')
    await complete(a.id)
    await expect(complete(a.id)).rejects.toBeInstanceOf(LockedError)
  })
})

describe('immutability after completion', () => {
  async function completedWithTree() {
    const a = await createAssessment(db, org.id, '1.0', { date: '2026-11-09' })
    const tree = await addTree(db, a.id)
    await complete(a.id)
    return { a, tree }
  }

  it('rejects answer, field and tree changes', async () => {
    const { a, tree } = await completedWithTree()
    await expect(setAnswer(db, a.id, 'team.briefed', { value: 'no' })).rejects.toBeInstanceOf(
      LockedError,
    )
    await expect(updateAssessment(db, a.id, { date: '2026-01-01' })).rejects.toBeInstanceOf(
      LockedError,
    )
    await expect(addTree(db, a.id)).rejects.toBeInstanceOf(LockedError)
    await expect(
      setTreeAnswer(db, tree.id, 'tree.species', { value: 'Eiche' }),
    ).rejects.toBeInstanceOf(LockedError)
    await expect(removeTree(db, tree.id)).rejects.toBeInstanceOf(LockedError)
  })

  it('also blocks direct database writes', async () => {
    const { a } = await completedWithTree()
    await expect(
      db.assessments.update(a.id, { answers: { 'team.briefed': { value: 'no' } } }),
    ).rejects.toBeInstanceOf(LockedError)
    // Writing an unchanged value is a harmless no-op.
    await expect(db.assessments.update(a.id, { answers: {} })).resolves.toBe(1)
    await expect(
      db.assessments.update(a.id, { protocolNumber: 'ZW-2026-9999' }),
    ).rejects.toBeInstanceOf(LockedError)
    await expect(db.assessments.update(a.id, { status: 'draft' })).rejects.toBeInstanceOf(
      LockedError,
    )
    await expect(db.assessments.delete(a.id)).rejects.toBeInstanceOf(LockedError)
    expect((await db.assessments.get(a.id))!.status).toBe('completed')
  })

  it('still allows marking as sent', async () => {
    const { a } = await completedWithTree()
    await markSent(db, a.id)
    const stored = (await db.assessments.get(a.id))!
    expect(stored.status).toBe('sent')
    expect(stored.sentAt).toBeTruthy()
  })
})

describe('new version (correction)', () => {
  it('copies content as a new draft referencing the original', async () => {
    const a = await createAssessment(db, org.id, '1.0', { date: '2026-11-09' })
    await setAnswer(db, a.id, 'team.briefed', { value: 'yes' })
    const tree = await addTree(db, a.id)
    await setTreeAnswer(db, tree.id, 'tree.species', { value: 'Buche' })
    await db.attachments.add({
      id: 'p1',
      organizationId: org.id,
      createdAt: '',
      updatedAt: '',
      syncState: 'pending',
      assessmentId: a.id,
      treeId: tree.id,
      kind: 'tree_photo',
      fileName: 'baum.jpg',
      mimeType: 'image/jpeg',
      blob: new Blob(['x']),
      capturedAt: '2026-11-09T08:00:00Z',
    })
    await complete(a.id)

    const v2 = await createNewVersion(db, a.id)
    expect(v2).toMatchObject({ status: 'draft', version: 2, previousVersionId: a.id })
    expect(v2.protocolNumber).toBeUndefined()
    expect(v2.answers['team.briefed']!.value).toBe('yes')

    const trees = await getTrees(db, v2.id)
    expect(trees).toHaveLength(1)
    expect(trees[0]!.id).not.toBe(tree.id)
    expect(trees[0]!.answers['tree.species']!.value).toBe('Buche')
    const photos = await db.attachments.where('treeId').equals(trees[0]!.id).toArray()
    expect(photos).toHaveLength(1)
    expect(photos[0]!.assessmentId).toBe(v2.id)

    // Original is untouched and still locked.
    expect((await db.assessments.get(a.id))!.status).toBe('completed')
    expect(await db.attachments.where('treeId').equals(tree.id).count()).toBe(1)

    // The new version can be edited and gets its own number.
    await setAnswer(db, v2.id, 'team.briefed', { value: 'no', note: 'Korrektur' })
    expect((await complete(v2.id)).protocolNumber).toBe('ZW-2026-0002')
  })

  it('is not available for drafts', async () => {
    const a = await createAssessment(db, org.id, '1.0')
    await expect(createNewVersion(db, a.id)).rejects.toThrow()
  })
})
