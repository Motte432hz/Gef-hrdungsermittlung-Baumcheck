import { QUALIFICATION_LABELS, type Worker } from './types'
import { todayLocal } from '../db/repo'

/** One-line summary for lists, e.g. "AS-Baum I · SKT A (abgelaufen)". */
export function qualificationSummary(w: Worker, today = todayLocal()): string {
  if (w.qualifications.length === 0) return 'Keine Qualifikationen hinterlegt'
  return w.qualifications
    .map((q) => {
      const label = QUALIFICATION_LABELS[q.type]
      return q.validUntil && q.validUntil < today ? `${label} (abgelaufen)` : label
    })
    .join(' · ')
}
