/** Measures in a note are separated by "; " (compact in the PDF, easy to read). */
const SEP = /\s*;\s*/

const parts = (note: string) =>
  note
    .split(SEP)
    .map((p) => p.trim())
    .filter(Boolean)

export const hasMeasure = (note: string, measure: string) => parts(note).includes(measure)

/** Adds the measure to the note, or removes it if it is already there. Free text stays. */
export function toggleMeasure(note: string, measure: string): string {
  const list = parts(note)
  const next = list.includes(measure) ? list.filter((p) => p !== measure) : [...list, measure]
  return next.join('; ')
}
