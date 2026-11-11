import type { BaumCheckDB } from '../../db/db'
import { addTree, setTreeAnswers } from '../../db/repo'
import type { Answers, Tree } from '../../domain/types'
import type { FormDefinition } from '../../form/schema'
import { confirmed } from '../../form/validation'
import { treeLabel } from './treeLabel'

/** Basic data taken over as is – visible and easy to correct on the first tree step. */
const PLAIN_IDS = ['tree.species', 'tree.height', 'tree.diameter', 'tree.growthForm']

/**
 * New tree "like tree N" (e.g. an avenue of similar trees): basic data is copied, the
 * assessment answers are copied as prefilled and must be confirmed at the new tree.
 * Tree number, photos and free-text remarks are never copied.
 */
export async function addTreeLike(
  db: BaumCheckDB,
  definition: FormDefinition,
  source: Tree,
): Promise<Tree> {
  const tree = await addTree(db, source.assessmentId)
  const from = treeLabel(source).split(' · ')[0]!
  const answers: Answers = {}
  for (const id of PLAIN_IDS)
    if (source.answers[id]) answers[id] = { ...structuredClone(source.answers[id]!) }
  for (const step of definition.steps) {
    if (step.repeat !== 'tree' || step.id === 'tree') continue
    for (const section of step.sections) {
      const ids = [
        ...(section.gate ? [section.gate.id] : []),
        ...section.items.filter((i) => i.type !== 'text').map((i) => i.id),
      ]
      for (const id of ids) {
        const a = source.answers[id]
        if (!a) continue
        answers[id] = { ...confirmed(structuredClone(a)), prefilled: true, prefilledFrom: from }
      }
    }
  }
  await setTreeAnswers(db, tree.id, answers)
  return { ...tree, answers }
}
