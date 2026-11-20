import type { Answers } from '../../domain/types'
import type {
  CheckpointItem,
  FormSection,
  FormStep,
  HazardItem,
  SectionGate,
} from '../../form/schema'
import { GATE_SOME } from '../../form/schema'
import { isItemVisible, type makeLookup } from '../../form/validation'

/** One card of the quick mode: a yes/no question. */
export type QuickCard =
  | { kind: 'gate'; id: string; gate: SectionGate; section: FormSection; hazards: HazardItem[] }
  | { kind: 'checkpoint'; id: string; item: CheckpointItem; section: FormSection }
  | { kind: 'hazard'; id: string; item: HazardItem; section: FormSection }

type Lookup = ReturnType<typeof makeLookup>

/** The yes/no questions of a step in form order; hazards of a gated section only after "Ja". */
export function quickCards(step: FormStep, answers: Answers, lookup: Lookup): QuickCard[] {
  const cards: QuickCard[] = []
  for (const section of step.sections) {
    const items = section.items.filter((i) => isItemVisible(i, lookup))
    const hazards = items.filter((i): i is HazardItem => i.type === 'hazard')
    const gateOpen = !section.gate || answers[section.gate.id]?.value === GATE_SOME
    let gateAdded = false
    for (const item of items) {
      if (item.type === 'hazard' && section.gate && !gateAdded) {
        cards.push({ kind: 'gate', id: section.gate.id, gate: section.gate, section, hazards })
        gateAdded = true
      }
      if (item.type === 'checkpoint') cards.push({ kind: 'checkpoint', id: item.id, item, section })
      else if (item.type === 'hazard' && gateOpen)
        cards.push({ kind: 'hazard', id: item.id, item, section })
    }
  }
  return cards
}

/** Still to do: unanswered, only prefilled, or a finding without measure. */
export function isOpenCard(card: QuickCard, answers: Answers): boolean {
  const a = answers[card.id]
  if (!a || a.prefilled) return true
  if (card.kind === 'gate') return false
  return (a.value === 'no' || a.value === 'present') && !a.note?.trim()
}

/** The next open card after `afterId` (from the start when afterId is not given). */
export function nextOpenCard(
  cards: QuickCard[],
  answers: Answers,
  afterId?: string,
): QuickCard | undefined {
  const start = afterId ? cards.findIndex((c) => c.id === afterId) + 1 : 0
  return cards.slice(start).find((c) => isOpenCard(c, answers))
}

/** Number of yes/no questions still open in a step (for the start button). */
export function quickOpenCount(step: FormStep, answers: Answers, lookup: Lookup): number {
  return quickCards(step, answers, lookup).filter((c) => isOpenCard(c, answers)).length
}
