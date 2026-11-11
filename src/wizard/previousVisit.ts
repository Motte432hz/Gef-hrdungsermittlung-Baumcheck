import type { BaumCheckDB } from '../db/db'
import { getTrees, setAnswers, updateAssessment } from '../db/repo'
import type { Answer, Assessment } from '../domain/types'
import { getDefinition } from '../form/definition'
import { collectFindings, type Finding } from '../form/validation'

/** Location and rescue data that can be taken over from an earlier visit. */
export const SITE_ANSWER_IDS = [
  'site.address',
  'site.w3w',
  'site.rescueAccess',
  'site.hospital',
] as const

export interface PreviousVisit {
  assessment: Assessment
  /** Hazards and deviations found last time, with their measures. */
  findings: Finding[]
}

/**
 * Latest completed assessment for the same customer and object (other than `excludeId`),
 * with what was found there. Undefined without a customer or without an earlier visit.
 */
export async function findPreviousVisit(
  db: BaumCheckDB,
  current: Pick<Assessment, 'id' | 'organizationId' | 'customerId' | 'siteId'>,
): Promise<PreviousVisit | undefined> {
  if (!current.customerId) return undefined
  const candidates = await db.assessments
    .where('customerId')
    .equals(current.customerId)
    .filter(
      (a) =>
        a.id !== current.id &&
        a.organizationId === current.organizationId &&
        a.status !== 'draft' &&
        (a.siteId ?? '') === (current.siteId ?? ''),
    )
    .toArray()
  const latest = candidates.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
  )[0]
  if (!latest) return undefined
  const trees = await getTrees(db, latest.id)
  const findings = collectFindings({
    definition: getDefinition(latest.formVersion),
    assessment: latest,
    trees,
  })
  return { assessment: latest, findings }
}

/** Answers of the earlier visit that the draft does not have yet. */
export function missingSiteAnswers(
  draft: Pick<Assessment, 'answers'>,
  previous: Pick<Assessment, 'answers'>,
): Record<string, Answer> {
  const out: Record<string, Answer> = {}
  for (const id of SITE_ANSWER_IDS) {
    const prev = previous.answers[id]
    const cur = draft.answers[id]?.value
    const empty = cur === undefined || (typeof cur === 'string' && !cur.trim())
    if (prev && empty) out[id] = { value: structuredClone(prev.value) }
  }
  return out
}

/** Takes over location and rescue data (only empty fields) and the GPS position. */
export async function applyPreviousSite(
  db: BaumCheckDB,
  draft: Assessment,
  previous: Assessment,
): Promise<void> {
  const changes = missingSiteAnswers(draft, previous)
  if (Object.keys(changes).length) await setAnswers(db, draft.id, changes)
  if (!draft.position && previous.position)
    await updateAssessment(db, draft.id, { position: previous.position })
}
