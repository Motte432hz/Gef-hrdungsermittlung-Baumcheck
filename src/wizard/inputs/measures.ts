/** Measures in a note are separated by "; " (compact in the PDF, easy to read). */
const SEP = /\s*;\s*/

export const measureParts = (note: string) =>
  note
    .split(SEP)
    .map((p) => p.trim())
    .filter(Boolean)

export const hasMeasure = (note: string, measure: string) => measureParts(note).includes(measure)

/** Adds the measure to the note, or removes it if it is already there. Free text stays. */
export function toggleMeasure(note: string, measure: string): string {
  const list = measureParts(note)
  const next = list.includes(measure) ? list.filter((p) => p !== measure) : [...list, measure]
  return next.join('; ')
}

/** How often each measure was used per item: item id → measure → count. */
export type MeasureStats = Map<string, Map<string, number>>

/** Counts the measures in the notes of earlier protocols (answers of assessments and trees). */
export function measureStats(answerSets: Record<string, { note?: string }>[]): MeasureStats {
  const stats: MeasureStats = new Map()
  for (const answers of answerSets)
    for (const [itemId, a] of Object.entries(answers)) {
      if (!a?.note) continue
      const counts = stats.get(itemId) ?? new Map<string, number>()
      // Each measure counts once per answer.
      for (const m of new Set(measureParts(a.note))) counts.set(m, (counts.get(m) ?? 0) + 1)
      stats.set(itemId, counts)
    }
  return stats
}

/** Own measures written at least this often appear as quick picks. */
export const OWN_MEASURE_MIN_USES = 2
const OWN_MEASURE_MAX = 4
const OWN_MEASURE_MAX_LENGTH = 80

/**
 * Quick picks in the order the company uses them: own frequent measures first, then the
 * suggested ones, most used first (otherwise in their given order).
 */
export function orderedMeasures(base: string[] = [], counts?: Map<string, number>): string[] {
  if (!counts?.size) return base
  const n = (m: string) => counts.get(m) ?? 0
  const own = [...counts.entries()]
    .filter(
      ([m, c]) =>
        !base.includes(m) && c >= OWN_MEASURE_MIN_USES && m.length <= OWN_MEASURE_MAX_LENGTH,
    )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
    .slice(0, OWN_MEASURE_MAX)
    .map(([m]) => m)
  const sorted = base
    .map((m, i) => ({ m, i }))
    .sort((a, b) => n(b.m) - n(a.m) || a.i - b.i)
    .map((x) => x.m)
  return [...own, ...sorted]
}
