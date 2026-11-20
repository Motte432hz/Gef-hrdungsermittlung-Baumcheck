import type { BaumCheckDB } from './db'
import {
  audit,
  getTrees,
  newId,
  nowIso,
  setAnswers,
  addTreeFromPrevious,
  updateAssessment,
} from './repo'
import type { Answers, Assessment, ID, JobTemplate, TeamMember } from '../domain/types'
import { equipmentItems } from '../pages/profiles/equipmentItems'
import { memberFromWorker } from '../wizard/special/teamOps'

/** Answers a job template takes over as they are. */
export const TEMPLATE_JOB_IDS = ['job.types', 'work.types'] as const

/** A template from an assessment: job types, work, team (profile people) and equipment. */
export function templateFromAssessment(a: Assessment, name: string): JobTemplate {
  const answers: Answers = {}
  for (const id of TEMPLATE_JOB_IDS) {
    const x = a.answers[id]
    if (x)
      answers[id] = {
        value: structuredClone(x.value),
        ...(x.otherText ? { otherText: x.otherText } : {}),
      }
  }
  const equipment: Record<string, string> = {}
  for (const item of equipmentItems) {
    const v = a.answers[item.id]?.value
    // Only what was in order; "no" is a finding of that day, not a standard.
    if (v === 'yes' || v === 'na') equipment[item.id] = v
  }
  return {
    id: newId(),
    name: name.trim(),
    answers,
    equipment,
    team: a.team
      .filter((m) => m.workerId)
      .map((m) => ({ workerId: m.workerId!, roles: [...m.roles] })),
    createdAt: nowIso(),
  }
}

async function writeTemplates(
  db: BaumCheckDB,
  orgId: ID,
  update: (list: JobTemplate[]) => JobTemplate[],
) {
  await db.transaction('rw', db.organizations, db.auditLog, async () => {
    const org = await db.organizations.get(orgId)
    if (!org) throw new Error('Organization not found')
    await db.organizations.update(orgId, {
      jobTemplates: update(org.jobTemplates ?? []),
      updatedAt: nowIso(),
      syncState: 'pending',
    })
    await audit(db, orgId, 'updated', 'organization', orgId, 'Einsatz-Vorlagen')
  })
}

export function saveJobTemplate(db: BaumCheckDB, orgId: ID, template: JobTemplate) {
  return writeTemplates(db, orgId, (list) => [
    ...list.filter((t) => t.id !== template.id),
    template,
  ])
}

export function renameJobTemplate(db: BaumCheckDB, orgId: ID, id: ID, name: string) {
  return writeTemplates(db, orgId, (list) =>
    list.map((t) => (t.id === id ? { ...t, name: name.trim() } : t)),
  )
}

export function deleteJobTemplate(db: BaumCheckDB, orgId: ID, id: ID) {
  return writeTemplates(db, orgId, (list) => list.filter((t) => t.id !== id))
}

/** Answers and team of a new draft from a template; people deleted since are left out. */
export async function fromTemplate(
  db: BaumCheckDB,
  template: JobTemplate,
  base: Answers,
): Promise<{ answers: Answers; team: TeamMember[]; supervisorMemberId?: ID }> {
  // Template equipment first, the standard equipment fills the rest; both stay "prefilled".
  const answers: Answers = { ...base }
  for (const [id, value] of Object.entries(template.equipment))
    answers[id] = { value, prefilled: true }
  for (const [id, a] of Object.entries(template.answers)) answers[id] = structuredClone(a)
  const team: TeamMember[] = []
  for (const t of template.team) {
    const w = await db.workers.get(t.workerId)
    if (!w || w.deletedAt) continue
    team.push(memberFromWorker(w, t.roles))
  }
  const supervisor = team.find((m) => m.roles.includes('supervisor'))
  return { answers, team, supervisorMemberId: supervisor?.id }
}

/** Team of an earlier assessment with fresh ids and the current qualifications. */
export async function copyTeam(
  db: BaumCheckDB,
  src: Pick<Assessment, 'team' | 'supervisorMemberId'>,
): Promise<{ team: TeamMember[]; supervisorMemberId?: ID }> {
  const idMap = new Map<string, string>()
  const team: TeamMember[] = []
  for (const m of src.team) {
    const worker = m.workerId ? await db.workers.get(m.workerId) : undefined
    if (worker?.deletedAt) continue
    const id = newId()
    idMap.set(m.id, id)
    team.push({
      ...structuredClone(m),
      id,
      qualifications: worker ? structuredClone(worker.qualifications) : m.qualifications,
    })
  }
  return {
    team,
    supervisorMemberId: src.supervisorMemberId ? idMap.get(src.supervisorMemberId) : undefined,
  }
}

/** Answers that "Wie beim letzten Mal" takes over (never checkpoints or hazards). */
export const REPEAT_ANSWER_IDS = [
  'job.types',
  'work.types',
  'site.address',
  'site.w3w',
  'site.rescueAccess',
  'site.hospital',
] as const

/**
 * "Alles wie beim letzten Mal": fills what is still empty in the draft from the last visit –
 * job, location and rescue, team and the trees (linked to their earlier findings).
 */
export async function repeatPreviousVisit(
  db: BaumCheckDB,
  draft: Assessment,
  previous: Assessment,
): Promise<{ answers: number; team: number; trees: number }> {
  const changes: Answers = {}
  for (const id of REPEAT_ANSWER_IDS)
    if (draft.answers[id] === undefined && previous.answers[id])
      changes[id] = structuredClone(previous.answers[id]!)
  if (Object.keys(changes).length) await setAnswers(db, draft.id, changes)

  let teamCount = 0
  if (draft.team.length === 0 && previous.team.length) {
    const copied = await copyTeam(db, previous)
    teamCount = copied.team.length
    await updateAssessment(db, draft.id, copied)
  }
  if (!draft.position && previous.position)
    await updateAssessment(db, draft.id, { position: structuredClone(previous.position) })

  let trees = 0
  if ((await getTrees(db, draft.id)).length === 0) {
    for (const t of await getTrees(db, previous.id)) {
      await addTreeFromPrevious(db, draft.id, t)
      trees++
    }
  }
  return { answers: Object.keys(changes).length, team: teamCount, trees }
}
