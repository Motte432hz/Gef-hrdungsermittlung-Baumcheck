import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../db/db'
import {
  addTree,
  completeAssessment,
  createAssessment,
  ensureOrganization,
  getTrees,
  setAnswer,
  updateAssessment,
} from '../db/repo'
import { saveDefaultEquipmentPreset, saveWorker } from '../db/profiles'
import { createFromTemplate } from './template'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  await db.delete()
})

describe('createFromTemplate', () => {
  it('copies master data and tree basics, never the checks', async () => {
    const org = await ensureOrganization(db, { name: 'Zwieselwiesel', numberPrefix: 'ZW' })
    const workerId = await saveWorker(db, org.id, {
      kind: 'employee',
      name: 'Anna Ast',
      qualifications: [{ type: 'skt_a' }],
      active: true,
    })
    await saveDefaultEquipmentPreset(db, org.id, { 'equip.ppeAvailable': 'yes' })
    const src = await createAssessment(db, org.id, '1.0', {
      date: '2026-05-01',
      customerId: 'c1',
      siteId: 's1',
    })
    await updateAssessment(db, src.id, {
      team: [
        {
          id: 'm1',
          workerId,
          kind: 'employee',
          name: 'Anna Ast',
          qualifications: [],
          roles: ['supervisor'],
        },
      ],
      supervisorMemberId: 'm1',
      position: { lat: 50, lng: 8, accuracy: 5, capturedAt: '2026-05-01T08:00:00Z' },
    })
    for (const [id, value] of [
      ['job.types', ['rope_access']],
      ['work.types', ['crown_maintenance']],
      ['site.address', 'Lindenstraße 4'],
      ['site.rescueAccess', 'Einfahrt Hofseite'],
      ['team.briefed', 'yes'],
      ['site.powerLines', 'present'],
    ] as const) {
      await setAnswer(db, src.id, id, {
        value: value as never,
        note: id === 'site.powerLines' ? 'x' : undefined,
      })
    }
    const t = await addTree(db, src.id)
    await db.trees.update(t.id, {
      answers: {
        'tree.species': { value: 'tilia-cordata' },
        'tree.height': { value: 18 },
        'tree.result': { value: 'safe' },
        'tree.crown.deadwood': { value: 'present', note: 'x' },
      },
    })
    await completeAssessment(db, src.id, { contentHash: 'h' })

    const copy = await createFromTemplate(db, src.id)
    expect(copy).toMatchObject({ status: 'draft', customerId: 'c1', siteId: 's1', version: 1 })
    expect(copy.previousVersionId).toBeUndefined()
    expect(copy.date).not.toBe('2026-05-01')
    expect(copy.answers['job.types']!.value).toEqual(['rope_access'])
    expect(copy.answers['site.rescueAccess']!.value).toBe('Einfahrt Hofseite')
    // Checks are not copied …
    expect(copy.answers['team.briefed']).toBeUndefined()
    expect(copy.answers['site.powerLines']).toBeUndefined()
    // … but the equipment preset is applied fresh (to be confirmed on site).
    expect(copy.answers['equip.ppeAvailable']).toEqual({ value: 'yes', prefilled: true })
    // Team with new ids, supervisor mapped, qualifications from the current profile.
    expect(copy.team).toHaveLength(1)
    expect(copy.team[0]!.id).not.toBe('m1')
    expect(copy.supervisorMemberId).toBe(copy.team[0]!.id)
    expect(copy.team[0]!.qualifications).toEqual([{ type: 'skt_a' }])
    const trees = await getTrees(db, copy.id)
    expect(trees).toHaveLength(1)
    expect(trees[0]!.answers).toEqual({
      'tree.species': { value: 'tilia-cordata' },
      'tree.height': { value: 18 },
    })
  })
})
