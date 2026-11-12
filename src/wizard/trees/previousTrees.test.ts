import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../../db/db'
import {
  addTree,
  addTreeFromPrevious,
  createAssessment,
  ensureOrganization,
  setTreeAnswers,
  setTreePosition,
} from '../../db/repo'
import { assessmentContentHash } from '../../report/contentHash'
import { lastAssessmentOf, previousTreesFor } from './previousTrees'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  await db.delete()
})

const at = (lat: number, lng: number) => ({
  lat,
  lng,
  accuracy: 5,
  capturedAt: '2026-04-01T08:00:00Z',
})

async function lastYear() {
  const org = await ensureOrganization(db)
  const a = await createAssessment(db, org.id, '1.0', {
    date: '2026-04-01',
    customerId: 'c1',
    siteId: 's1',
  })
  const near = await addTree(db, a.id)
  await setTreeAnswers(db, near.id, {
    'tree.number': { value: '7' },
    'tree.species': { value: 'tilia-cordata' },
    'tree.height': { value: 18 },
    'tree.crown.gate': { value: 'some' },
    'tree.crown.deadwood': { value: 'present', note: 'Totholz entfernt' },
    'tree.result': { value: 'safe' },
  })
  await setTreePosition(db, near.id, at(50.1, 8.6))
  const far = await addTree(db, a.id)
  await setTreePosition(db, far.id, at(50.2, 8.6))
  await db.assessments.update(a.id, { status: 'completed' })
  return { org, near, far }
}

describe('trees from the last visit', () => {
  it('lists them nearest first with result and findings; taken trees disappear', async () => {
    const { org, near, far } = await lastYear()
    const now = await createAssessment(db, org.id, '1.0', { customerId: 'c1', siteId: 's1' })
    let list = await previousTreesFor(db, now, [], { lat: 50.1001, lng: 8.6 })
    expect(list.map((p) => [p.tree.id, p.distanceM])).toEqual([
      [near.id, 11],
      [far.id, 11108],
    ])
    expect(list[0]!.result).toBe('Ja')
    expect(list[0]!.findings.map((f) => [f.label, f.note])).toEqual([
      ['Totholz', 'Totholz entfernt'],
    ])

    const t = await addTreeFromPrevious(db, now.id, near)
    const copy = (await db.trees.get(t.id))!
    expect(copy.answers['tree.number']?.value).toBe('7')
    expect(copy.answers['tree.crown.deadwood']).toBeUndefined() // assessed anew
    expect(copy.position?.lat).toBe(50.1)
    list = await previousTreesFor(db, now, [copy])
    expect(list.map((p) => p.tree.id)).toEqual([far.id])

    const last = (await lastAssessmentOf(db, copy))!
    expect([last.date, last.findings.length]).toEqual(['2026-04-01', 1])
  })

  it('the tree position is part of what is signed', async () => {
    const org = await ensureOrganization(db)
    const a = await createAssessment(db, org.id, '1.0')
    const t = await addTree(db, a.id)
    const h1 = await assessmentContentHash(a, [(await db.trees.get(t.id))!])
    await setTreePosition(db, t.id, at(50.1, 8.6))
    const h2 = await assessmentContentHash(a, [(await db.trees.get(t.id))!])
    expect(h2).not.toBe(h1)
  })
})
