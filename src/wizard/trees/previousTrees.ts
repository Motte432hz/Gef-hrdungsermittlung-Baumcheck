import type { BaumCheckDB } from '../../db/db'
import { getTrees } from '../../db/repo'
import type { Assessment, Tree } from '../../domain/types'
import { getDefinition } from '../../form/definition'
import { collectFindings, selectedOptions, type Finding } from '../../form/validation'
import { findPreviousVisit } from '../previousVisit'
import { distanceKm, type LatLng } from '../../domain/geo'

export interface PreviousTree {
  tree: Tree
  /** Date of the earlier assessment (YYYY-MM-DD) and its number. */
  date: string
  protocolNumber?: string
  /** "Ja", "Nein", "Eingehende Untersuchung erforderlich" … */
  result?: string
  findings: Finding[]
  /** Metres from the given position, if both are known. */
  distanceM?: number
}

function resultText(a: Assessment, tree: Tree): string | undefined {
  const def = getDefinition(a.formVersion)
  const item = def.steps
    .flatMap((s) => s.sections.flatMap((x) => x.items))
    .find((i) => i.id === 'tree.result')
  return item ? selectedOptions(item, tree.answers['tree.result'])[0]?.label : undefined
}

function describe(a: Assessment, tree: Tree, findings: Finding[], from?: LatLng): PreviousTree {
  return {
    tree,
    date: a.date,
    protocolNumber: a.protocolNumber,
    result: resultText(a, tree),
    findings: findings.filter((f) => f.treeId === tree.id),
    distanceM:
      from && tree.position ? Math.round(distanceKm(from, tree.position) * 1000) : undefined,
  }
}

/**
 * Trees of the last completed assessment at the same customer and object that are not yet
 * part of this assessment – nearest first when positions are known.
 */
export async function previousTreesFor(
  db: BaumCheckDB,
  current: Assessment,
  taken: Tree[],
  from?: LatLng,
): Promise<PreviousTree[]> {
  const prev = await findPreviousVisit(db, current)
  if (!prev) return []
  const used = new Set(taken.map((t) => t.previousTreeId).filter(Boolean))
  const list = (await getTrees(db, prev.assessment.id))
    .filter((t) => !used.has(t.id))
    .map((t) => describe(prev.assessment, t, prev.findings, from))
  return list.sort(
    (a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity) || a.tree.index - b.tree.index,
  )
}

/** The earlier assessment of a tree that was taken over (for comparison). */
export async function lastAssessmentOf(
  db: BaumCheckDB,
  tree: Tree,
): Promise<PreviousTree | undefined> {
  if (!tree.previousTreeId) return undefined
  const prevTree = await db.trees.get(tree.previousTreeId)
  const a = prevTree && (await db.assessments.get(prevTree.assessmentId))
  if (!prevTree || !a) return undefined
  const findings = collectFindings({
    definition: getDefinition(a.formVersion),
    assessment: a,
    trees: [prevTree],
  })
  return describe(a, prevTree, findings)
}
