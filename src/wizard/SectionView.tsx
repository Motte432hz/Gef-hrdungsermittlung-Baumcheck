import type { Answer, Answers } from '../domain/types'
import type { FormItem, FormSection } from '../form/schema'
import { GATE_NONE, GATE_SOME } from '../form/schema'
import { isItemVisible, makeLookup } from '../form/validation'
import { Segmented } from '../components/form/Segmented'
import { useWizard } from './WizardContext'
import { ItemField } from './ItemField'
import { itemAnchor } from './anchors'
import { OPEN_ATTR, scrollToNextOpen } from './nextOpen'
import { ItemLabel } from './inputs/InfoButton'
import { ItemCard, PrefilledBadge } from './inputs/ItemCard'

/**
 * One form section. Gated sections first ask a filter question ("Gibt es Auffälligkeiten …?");
 * the individual hazards are only shown when the answer is yes.
 */
export function SectionView({
  section,
  lookup,
  answers,
  treeId,
  headingLevel = 2,
}: {
  section: FormSection
  lookup: ReturnType<typeof makeLookup>
  answers: Answers
  treeId?: string
  headingLevel?: 2 | 3
}) {
  const items = section.items.filter((i) => isItemVisible(i, lookup))
  if (items.length === 0) return null
  const H = headingLevel === 2 ? 'h2' : 'h3'
  const gate = section.gate
  const gateValue = gate ? answers[gate.id]?.value : undefined
  // Definition order: items before the first hazard, the hazards, then the rest.
  const first = gate ? items.findIndex((i) => i.type === 'hazard') : -1
  const before = first < 0 ? items : items.slice(0, first)
  const gated = first < 0 ? [] : items.filter((i) => i.type === 'hazard')
  const after = first < 0 ? [] : items.slice(first).filter((i) => i.type !== 'hazard')
  const field = (item: FormItem) => (
    // Keyed by tree: switching trees remounts inputs with that tree's values.
    <ItemField key={`${treeId ?? ''}-${item.id}`} item={item} treeId={treeId} />
  )

  return (
    <section className="space-y-3" aria-label={section.title}>
      {section.title && <H className="text-xl font-bold">{section.title}</H>}
      <AllYesButton items={[...before, ...after]} answers={answers} treeId={treeId} />
      {gate ? (
        <>
          {/* Non-hazard items (e.g. Roloff vitality) stay above the filter question. */}
          {before.map(field)}
          <GateField section={section} answers={answers} treeId={treeId} hazards={gated} />
          {gateValue === GATE_SOME && gated.map(field)}
          {after.map(field)}
        </>
      ) : (
        before.map(field)
      )}
    </section>
  )
}

function GateField({
  section,
  answers,
  treeId,
  hazards,
}: {
  section: FormSection
  answers: Answers
  treeId?: string
  hazards: FormItem[]
}) {
  const { setAnswers } = useWizard()
  const gate = section.gate!
  const gateAnswer = answers[gate.id]
  const value = gateAnswer?.value as typeof GATE_NONE | typeof GATE_SOME | undefined
  const present = hazards.filter((h) => answers[h.id]?.value === 'present')
  const open = hazards.filter((h) => answers[h.id] === undefined)

  const choose = (v: typeof GATE_NONE | typeof GATE_SOME) => {
    if (v === GATE_NONE) {
      if (
        present.length > 0 &&
        !window.confirm(
          `${present.length} ${present.length === 1 ? 'Merkmal ist' : 'Merkmale sind'} als „vorhanden“ eingetragen. Wirklich alles als unauffällig markieren? Die Angaben werden gelöscht.`,
        )
      )
        return
      // "No abnormalities" replaces the individual answers.
      const changes: Record<string, undefined | { value: string }> = { [gate.id]: { value: v } }
      for (const h of hazards) changes[h.id] = undefined
      void setAnswers(changes, treeId).then(() => scrollToNextOpen(itemAnchor(gate.id, treeId)))
    } else void setAnswers({ [gate.id]: { value: v } }, treeId)
  }

  const restAbsent = () => {
    const changes: Record<string, { value: string }> = {}
    for (const h of open) changes[h.id] = { value: 'absent' }
    void setAnswers(changes, treeId).then(() => scrollToNextOpen(itemAnchor(gate.id, treeId)))
  }

  return (
    <div
      id={itemAnchor(gate.id, treeId)}
      className="scroll-mt-40"
      {...(value === undefined ? { [OPEN_ATTR]: '' } : {})}
    >
      <ItemCard tone={value === GATE_SOME && present.length > 0 ? 'bad' : undefined}>
        <ItemLabel label={gate.label} info={gate.info} />
        <Segmented
          label={gate.label}
          options={[
            { value: GATE_NONE, label: 'Nein, unauffällig' },
            { value: GATE_SOME, label: 'Ja, einzeln prüfen' },
          ]}
          value={value}
          onChange={choose}
          tones={{ none: 'good', some: 'bad' }}
        />
        {gateAnswer?.prefilled && (
          <PrefilledBadge
            from={gateAnswer.prefilledFrom}
            onConfirm={() => void setAnswers({ [gate.id]: { value: gateAnswer.value } }, treeId)}
          />
        )}
        {value === GATE_NONE && (
          <p className="text-sm text-stone-700 dark:text-stone-300">
            ✓ {hazards.length} Merkmale als unauffällig erfasst.
          </p>
        )}
        {value === GATE_SOME && open.length > 0 && (
          <button
            type="button"
            onClick={restAbsent}
            className="min-h-12 w-full rounded-xl border-2 border-stone-300 px-3 font-semibold dark:border-stone-600"
          >
            Übrige {open.length} als „nicht vorhanden“ markieren
          </button>
        )}
      </ItemCard>
    </div>
  )
}

/**
 * "Everything fine": answers all open checkpoints of a section with yes and confirms
 * those prefilled with yes. Only shown when it saves at least two taps.
 */
function AllYesButton({
  items,
  answers,
  treeId,
}: {
  items: FormItem[]
  answers: Answers
  treeId?: string
}) {
  const { setAnswers } = useWizard()
  const pending = items.filter(
    (i) =>
      i.type === 'checkpoint' &&
      (answers[i.id] === undefined || (answers[i.id]?.prefilled && answers[i.id]?.value === 'yes')),
  )
  if (pending.length < 2) return null
  const apply = () => {
    const changes: Record<string, Answer> = {}
    for (const i of pending) {
      const note = answers[i.id]?.note
      changes[i.id] = { value: 'yes', ...(note ? { note } : {}) }
    }
    void setAnswers(changes, treeId)
  }
  return (
    <button
      type="button"
      onClick={apply}
      className="min-h-12 w-full rounded-xl border-2 border-brand-700 px-3 font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-300 dark:text-brand-300 dark:hover:bg-brand-900"
    >
      Alle {pending.length} offenen mit „Ja“ beantworten
    </button>
  )
}
