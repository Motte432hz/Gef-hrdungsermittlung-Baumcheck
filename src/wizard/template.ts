import type { BaumCheckDB } from '../db/db'
import { addTree, audit, getTrees, newId, updateAssessment } from '../db/repo'
import type { Answers, Assessment, TeamMember } from '../domain/types'
import { startAssessment } from './start'

/** Data that stays the same for a recurring job. Checkpoints and hazards are never copied. */
export const TEMPLATE_ANSWER_IDS = [
  'job.types',
  'site.address',
  'site.w3w',
  'site.rescueAccess',
  'site.hospital',
  'work.types',
] as const
export const TEMPLATE_TREE_IDS = [
  'tree.number',
  'tree.species',
  'tree.height',
  'tree.diameter',
] as const

/**
 * New draft based on an earlier assessment (e.g. yearly care of the same trees): customer,
 * location, rescue info, team and tree basics are copied; every check must be done again.
 */
export async function createFromTemplate(db: BaumCheckDB, sourceId: string): Promise<Assessment> {
  const src = await db.assessments.get(sourceId)
  if (!src) throw new Error('not found')
  const draft = await startAssessment(db, src.organizationId)

  const answers: Answers = { ...draft.answers }
  for (const id of TEMPLATE_ANSWER_IDS)
    if (src.answers[id]) answers[id] = structuredClone(src.answers[id]!)

  // Team with fresh ids; qualifications refreshed from the current profiles.
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

  await updateAssessment(db, draft.id, {
    answers,
    team,
    supervisorMemberId: src.supervisorMemberId ? idMap.get(src.supervisorMemberId) : undefined,
    customerId: src.customerId,
    siteId: src.siteId,
    position: src.position,
  })

  for (const t of await getTrees(db, sourceId)) {
    const tree = await addTree(db, draft.id)
    const treeAnswers: Answers = {}
    for (const id of TEMPLATE_TREE_IDS)
      if (t.answers[id]) treeAnswers[id] = structuredClone(t.answers[id]!)
    await db.trees.update(tree.id, { answers: treeAnswers })
  }
  await audit(
    db,
    src.organizationId,
    'created',
    'assessment',
    draft.id,
    `Vorlage: ${src.protocolNumber ?? src.id}`,
  )
  return (await db.assessments.get(draft.id))!
}
