import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../db/db'
import { createAssessment, ensureOrganization, setAnswers } from '../db/repo'
import { applyPreviousSite, findPreviousVisit } from './previousVisit'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  await db.delete()
})

async function visit(orgId: string, date: string, siteId: string | undefined, done = true) {
  const a = await createAssessment(db, orgId, '1.0', { date, customerId: 'c1', siteId })
  await setAnswers(db, a.id, {
    'site.address': { value: `Lindenstraße 4 (${date})` },
    'site.rescueAccess': { value: 'Einfahrt Hofseite' },
    'site.hazards.gate': { value: 'some' },
    'site.powerLines': { value: 'present', note: 'Netzbetreiber schaltet frei' },
  })
  if (done)
    await db.assessments.update(a.id, { status: 'completed', completedAt: `${date}T12:00:00Z` })
  return a
}

describe('previous visit', () => {
  it('finds the latest completed visit at the same object with its hazards', async () => {
    const org = await ensureOrganization(db, { name: 'Zwieselwiesel', numberPrefix: 'ZW' })
    await visit(org.id, '2025-04-01', 's1')
    const latest = await visit(org.id, '2026-04-01', 's1')
    await visit(org.id, '2026-09-01', 's2') // other object
    await visit(org.id, '2026-10-01', 's1', false) // draft
    const draft = await createAssessment(db, org.id, '1.0', { customerId: 'c1', siteId: 's1' })

    const prev = await findPreviousVisit(db, draft)
    expect(prev?.assessment.id).toBe(latest.id)
    expect(prev?.findings).toEqual([
      expect.objectContaining({
        itemId: 'site.powerLines',
        note: 'Netzbetreiber schaltet frei',
      }),
    ])
    expect(await findPreviousVisit(db, { ...draft, customerId: undefined })).toBeUndefined()
  })

  it('takes over only empty location fields, never checks', async () => {
    const org = await ensureOrganization(db, { name: 'Zwieselwiesel', numberPrefix: 'ZW' })
    const prev = await visit(org.id, '2026-04-01', undefined)
    const draft = await createAssessment(db, org.id, '1.0', { customerId: 'c1' })
    await setAnswers(db, draft.id, { 'site.address': { value: 'Eigene Adresse' } })

    await applyPreviousSite(
      db,
      (await db.assessments.get(draft.id))!,
      (await db.assessments.get(prev.id))!,
    )
    const a = (await db.assessments.get(draft.id))!
    expect(a.answers['site.address']?.value).toBe('Eigene Adresse')
    expect(a.answers['site.rescueAccess']?.value).toBe('Einfahrt Hofseite')
    expect(a.answers['site.powerLines']).toBeUndefined()
    expect(a.answers['site.hazards.gate']).toBeUndefined()
  })
})
