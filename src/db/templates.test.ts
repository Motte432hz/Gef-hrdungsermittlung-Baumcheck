import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from './db'
import {
  addTree,
  createAssessment,
  ensureOrganization,
  setTreeAnswers,
  updateAssessment,
} from './repo'
import { saveWorker, saveDefaultEquipmentPreset } from './profiles'
import {
  deleteJobTemplate,
  repeatPreviousVisit,
  saveJobTemplate,
  templateFromAssessment,
} from './templates'
import { startAssessment } from '../wizard/start'
import { memberFromWorker } from '../wizard/special/teamOps'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`templates-${crypto.randomUUID()}`)
})
afterEach(() => db.delete())

async function setup() {
  const org = await ensureOrganization(db)
  const wid = await saveWorker(db, org.id, {
    kind: 'employee',
    name: 'Mia',
    qualifications: [{ type: 'skt_a' }],
    active: true,
  })
  const w = (await db.workers.get(wid))!
  const a = await createAssessment(db, org.id, '1.0', {
    answers: {
      'job.types': { value: ['rope_access'] },
      'work.types': { value: ['other'], otherText: 'Mistel entfernen' },
      'equip.ppeAvailable': { value: 'yes' },
      'equip.ppeChecked': { value: 'no', note: 'Helm defekt' },
      'site.address': { value: 'Lindenstraße 4' },
      'team.briefed': { value: 'yes' },
    },
  })
  const m = memberFromWorker(w, ['supervisor', 'climber'])
  await updateAssessment(db, a.id, { team: [m], supervisorMemberId: m.id })
  return { org, worker: w, source: (await db.assessments.get(a.id))! }
}

describe('job templates', () => {
  it('keep job, work, team and only equipment that was in order', async () => {
    const { source, worker } = await setup()
    const t = templateFromAssessment(source, ' SKT Mistel ')
    expect(t.name).toBe('SKT Mistel')
    expect(t.answers['work.types']).toEqual({ value: ['other'], otherText: 'Mistel entfernen' })
    expect(t.equipment).toEqual({ 'equip.ppeAvailable': 'yes' })
    expect(t.answers['team.briefed']).toBeUndefined()
    expect(t.team).toEqual([{ workerId: worker.id, roles: ['supervisor', 'climber'] }])
  })

  it('start a new job with team, supervisor and prefilled equipment', async () => {
    const { org, source } = await setup()
    await saveDefaultEquipmentPreset(db, org.id, { 'emergency.firstAidKit': 'yes' })
    const t = templateFromAssessment(source, 'SKT')
    await saveJobTemplate(db, org.id, t)
    expect((await db.organizations.get(org.id))!.jobTemplates).toHaveLength(1)

    const a = await startAssessment(db, org.id, { template: t })
    expect(a.answers['job.types']?.value).toEqual(['rope_access'])
    expect(a.answers['equip.ppeAvailable']).toEqual({ value: 'yes', prefilled: true })
    expect(a.answers['emergency.firstAidKit']).toEqual({ value: 'yes', prefilled: true })
    expect(a.team.map((m) => m.name)).toEqual(['Mia'])
    expect(a.supervisorMemberId).toBe(a.team[0]!.id)

    await deleteJobTemplate(db, org.id, t.id)
    expect((await db.organizations.get(org.id))!.jobTemplates).toEqual([])
  })

  it('leave out people deleted since', async () => {
    const { org, source, worker } = await setup()
    await db.workers.update(worker.id, { deletedAt: new Date().toISOString() })
    const a = await startAssessment(db, org.id, { template: templateFromAssessment(source, 'x') })
    expect(a.team).toEqual([])
  })
})

describe('everything like last time', () => {
  it('fills only what is empty and links the trees', async () => {
    const { org, source } = await setup()
    const tree = await addTree(db, source.id)
    await setTreeAnswers(db, tree.id, { 'tree.height': { value: 18 } })
    const draft = await createAssessment(db, org.id, '1.0', {
      answers: { 'job.types': { value: ['tree_work'] } },
    })
    const r = await repeatPreviousVisit(db, draft, source)
    expect(r).toEqual({ answers: 2, team: 1, trees: 1 })
    const after = (await db.assessments.get(draft.id))!
    expect(after.answers['job.types']?.value).toEqual(['tree_work']) // kept
    expect(after.answers['site.address']?.value).toBe('Lindenstraße 4')
    expect(after.answers['team.briefed']).toBeUndefined() // checks are never copied
    const trees = await db.trees.where('assessmentId').equals(draft.id).toArray()
    expect(trees[0]?.previousTreeId).toBe(tree.id)
  })
})
