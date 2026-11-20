import { currentDefinition, findItem } from '../../form/definition'
import type { JobTemplate } from '../../domain/types'

const optionLabels = (itemId: string): Record<string, string> => {
  const item = findItem(currentDefinition, itemId)?.item
  return item && 'options' in item
    ? Object.fromEntries(item.options.map((o) => [o.value, o.label]))
    : {}
}

export const JOB_TYPE_LABELS = {
  job: optionLabels('job.types'),
  work: optionLabels('work.types'),
}

const values = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])

/** "SKT · Kronenpflege, Totholz · 3 Personen · 12 Ausrüstungspunkte" */
export function templateSummary(t: JobTemplate, labels = JOB_TYPE_LABELS): string {
  const job = values(t.answers['job.types']?.value).map((v) => labels.job[v] ?? v)
  const work = values(t.answers['work.types']?.value).map((v) =>
    v === 'other' ? (t.answers['work.types']?.otherText ?? 'Sonstiges') : (labels.work[v] ?? v),
  )
  const eq = Object.keys(t.equipment).length
  return [
    job.join(', '),
    work.join(', '),
    t.team.length ? `${t.team.length} ${t.team.length === 1 ? 'Person' : 'Personen'}` : '',
    eq ? `${eq} Ausrüstungspunkte` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}
