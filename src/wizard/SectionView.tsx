import type { Answers } from '../domain/types'
import type { FormItem, FormSection } from '../form/schema'
import { GATE_NONE, GATE_SOME, isGatedOut } from '../form/schema'
import { isItemVisible, makeLookup } from '../form/validation'
import { Segmented } from '../components/form/Segmented'
import { useWizard } from './WizardContext'
import { ItemField } from './ItemField'
import { itemAnchor } from './anchors'
import { ItemLabel } from './inputs/InfoButton'
import { ItemCard } from './inputs/ItemCard'

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
  const before = gate ? items.filter((i) => i.type !== 'hazard') : items
  const gated = gate ? items.filter((i) => i.type === 'hazard') : []
  const field = (item: FormItem) => (
    // Keyed by tree: switching trees remounts inputs with that tree's values.
    <ItemField key={`${treeId ?? ''}-${item.id}`} item={item} treeId={treeId} />
  )

  return (
    <section className="space-y-3" aria-label={section.title}>
      {section.title && <H className="text-xl font-bold">{section.title}</H>}
      {gate ? (
        <>
          {/* Non-hazard items (e.g. Roloff vitality) stay above the filter question. */}
          {before.filter((i) => !isGatedOut(section, i, gateValue)).map(field)}
          <GateField section={section} answers={answers} treeId={treeId} hazards={gated} />
          {gateValue === GATE_SOME && gated.map(field)}
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
  const value = answers[gate.id]?.value as typeof GATE_NONE | typeof GATE_SOME | undefined
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
      void setAnswers(changes, treeId)
    } else void setAnswers({ [gate.id]: { value: v } }, treeId)
  }

  const restAbsent = () => {
    const changes: Record<string, { value: string }> = {}
    for (const h of open) changes[h.id] = { value: 'absent' }
    void setAnswers(changes, treeId)
  }

  return (
    <div id={itemAnchor(gate.id, treeId)} className="scroll-mt-40">
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
