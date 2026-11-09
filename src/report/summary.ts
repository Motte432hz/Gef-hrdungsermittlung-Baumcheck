import type { Answer, Assessment, Customer, Tree } from '../domain/types'
import type { FormDefinition, FormItem } from '../form/schema'
import { isItemVisible, makeLookup, selectedOptions } from '../form/validation'
import { speciesLabel } from '../form/species'
import { ROLE_LABELS } from '../domain/roles'
import { QUALIFICATION_LABELS } from '../domain/types'
import { formatDecimal } from '../domain/geo'
import { formatAddress } from '../domain/address'

/** ok = fine; bad = deviation/hazard with measure; danger = red; neutral = plain data */
export type RowTone = 'ok' | 'bad' | 'danger' | 'neutral' | 'empty'

export interface SummaryRow {
  itemId: string
  label: string
  value: string
  /** Measure / reason for deviations and hazards. */
  note?: string
  noteLabel?: string
  tone: RowTone
}

export interface SummarySection {
  stepId: string
  title: string
  treeId?: string
  rows: SummaryRow[]
}

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export interface SummaryContext {
  definition: FormDefinition
  assessment: Assessment
  trees: Tree[]
  customer?: Customer
  photoCount?: Record<string, number>
}

function row(
  item: FormItem,
  answer: Answer | undefined,
  ctx: SummaryContext,
  treeId?: string,
): SummaryRow | null {
  const { assessment, definition } = ctx
  const base = { itemId: item.id, label: item.label }
  const empty = { ...base, value: '–', tone: 'empty' as const }
  switch (item.type) {
    case 'checkpoint': {
      const v = answer?.value
      if (v === 'yes') return { ...base, value: 'Ja', tone: 'ok' }
      if (v === 'na') return { ...base, value: 'nicht relevant', tone: 'neutral' }
      if (v === 'no')
        return {
          ...base,
          value: 'Nein',
          tone: 'bad',
          note: answer?.note,
          noteLabel: definition.noteLabels.checkpoint,
        }
      return empty
    }
    case 'hazard': {
      const v = answer?.value
      if (v === 'absent') return { ...base, value: 'nicht vorhanden', tone: 'ok' }
      if (v === 'present')
        return {
          ...base,
          value: 'vorhanden',
          tone: 'bad',
          note: answer?.note,
          noteLabel: definition.noteLabels.hazard,
        }
      return empty
    }
    case 'single':
    case 'multi': {
      const sel = selectedOptions(item, answer)
      if (sel.length === 0) return empty
      const value = sel
        .map((o) => (o.isOther && answer?.otherText ? `${o.label}: ${answer.otherText}` : o.label))
        .join(', ')
      const danger = sel.some((o) => o.severity === 'danger')
      const warn = sel.some((o) => o.warning)
      const noteOpt = sel.find((o) => o.requiresNote)
      return {
        ...base,
        value,
        tone: danger ? 'danger' : warn ? 'bad' : 'neutral',
        note: noteOpt ? answer?.note : undefined,
        noteLabel: noteOpt?.noteLabel,
      }
    }
    case 'number':
      return typeof answer?.value === 'number'
        ? {
            ...base,
            value: `${String(answer.value).replace('.', ',')}${item.unit ? ` ${item.unit}` : ''}`,
            tone: 'neutral',
          }
        : empty
    case 'text':
    case 'time':
    case 'address':
      return typeof answer?.value === 'string' && answer.value.trim()
        ? {
            ...base,
            value: answer.value.trim() + (item.type === 'time' ? ' Uhr' : ''),
            tone: 'neutral',
          }
        : empty
    case 'treeSpecies':
      return {
        ...base,
        value: speciesLabel(answer) ?? '–',
        tone: speciesLabel(answer) ? 'neutral' : 'empty',
      }
    case 'photos': {
      const n = treeId ? (ctx.photoCount?.[treeId] ?? 0) : 0
      return {
        ...base,
        value: n === 0 ? 'keine' : `${n} ${n === 1 ? 'Foto' : 'Fotos'} (im Anhang)`,
        tone: 'neutral',
      }
    }
    case 'customer': {
      const c = ctx.customer
      if (!c) return { ...base, value: 'ohne Kunde', tone: 'neutral' }
      const site = c.sites.find((s) => s.id === assessment.siteId)
      return { ...base, value: site ? `${c.name} – ${site.name}` : c.name, tone: 'neutral' }
    }
    case 'date':
      return { ...base, value: formatDate(assessment.date), tone: 'neutral' }
    case 'supervisor': {
      const m = assessment.team.find((x) => x.id === assessment.supervisorMemberId)
      return m ? { ...base, value: m.name, tone: 'neutral' } : empty
    }
    case 'gps': {
      const p = assessment.position
      return p
        ? { ...base, value: `${formatDecimal(p)} (± ${p.accuracy ?? '?'} m)`, tone: 'neutral' }
        : { ...base, value: 'nicht erfasst', tone: 'empty' }
    }
    case 'team': {
      if (assessment.team.length === 0) return empty
      const value = assessment.team
        .map((m) => {
          const roles = m.roles.map((r) => ROLE_LABELS[r]).join(', ') || 'ohne Rolle'
          const quals = m.qualifications.map((q) => QUALIFICATION_LABELS[q.type]).join(', ')
          return `${m.name}${m.company ? ` (${m.company})` : ''} – ${roles}${quals ? ` – ${quals}` : ''}`
        })
        .join('\n')
      return { ...base, value, tone: 'neutral' }
    }
  }
}

/** Structured overview of all visible answers – used by the summary screen and the PDF. */
export function buildSummary(ctx: SummaryContext): SummarySection[] {
  const { definition, assessment, trees } = ctx
  const out: SummarySection[] = []
  for (const step of definition.steps) {
    if (step.repeat === 'tree') {
      for (const t of [...trees].sort((a, b) => a.index - b.index)) {
        const lookup = makeLookup(assessment.answers, t.answers)
        const rows = step.sections
          .flatMap((s) => s.items)
          .filter((i) => isItemVisible(i, lookup))
          .map((i) => row(i, t.answers[i.id], ctx, t.id))
          .filter((r): r is SummaryRow => !!r)
        out.push({
          stepId: step.id,
          title: `${step.title} – Baum ${t.index + 1}`,
          treeId: t.id,
          rows,
        })
      }
    } else {
      const lookup = makeLookup(assessment.answers)
      const rows = step.sections
        .flatMap((s) => s.items)
        .filter((i) => isItemVisible(i, lookup))
        .map((i) => row(i, assessment.answers[i.id], ctx))
        .filter((r): r is SummaryRow => !!r)
      out.push({ stepId: step.id, title: step.title, rows })
    }
  }
  return out
}

/** "Lindenstraße 4, 60311 Frankfurt" – place for the signature line ("Ort, Datum"). */
export function signaturePlace(ctx: Pick<SummaryContext, 'assessment' | 'customer'>): string {
  const address = ctx.assessment.answers['site.address']?.value
  if (typeof address === 'string' && address.trim()) return address.trim().split('\n')[0]!
  const site = ctx.customer?.sites.find((s) => s.id === ctx.assessment.siteId)
  if (site && formatAddress(site)) return formatAddress(site)
  if (ctx.assessment.position) return formatDecimal(ctx.assessment.position)
  return ''
}
