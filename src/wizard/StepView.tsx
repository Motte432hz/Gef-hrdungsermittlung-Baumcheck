import { useEffect } from 'react'
import { useLocation } from 'react-router'
import type { FormStep } from '../form/schema'
import { isItemVisible, makeLookup } from '../form/validation'
import { confirmPrefilled } from '../db/repo'
import { db } from '../db/db'
import { useWizard } from './WizardContext'
import { ItemField } from './ItemField'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmergencyCard } from './special/EmergencyCard'

export function StepView({ step }: { step: FormStep }) {
  const { assessment } = useWizard()
  const { hash } = useLocation()

  // Jump to an item (from the summary list).
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    el?.scrollIntoView({ block: 'start' })
    el?.querySelector<HTMLElement>('input, textarea, select, button')?.focus({
      preventScroll: true,
    })
  }, [hash, step.id])

  if (step.repeat === 'tree') {
    return (
      <Card>
        <p className="text-stone-700 dark:text-stone-300">
          Die Erfassung der Bäume mit Fotos und Beurteilung kommt im nächsten Ausbauschritt.
        </p>
      </Card>
    )
  }

  const lookup = makeLookup(assessment.answers)
  const visible = step.sections.map((s) => ({
    ...s,
    items: s.items.filter((i) => isItemVisible(i, lookup)),
  }))
  const prefilled = visible
    .flatMap((s) => s.items)
    .filter((i) => assessment.answers[i.id]?.prefilled)
    .map((i) => i.id)

  return (
    <div className="space-y-6">
      {step.intro && <p className="text-stone-700 dark:text-stone-300">{step.intro}</p>}
      {prefilled.length > 0 && (
        <Card>
          <p className="mb-3">
            {prefilled.length} {prefilled.length === 1 ? 'Punkt ist' : 'Punkte sind'} aus der
            Standard-Ausrüstung vorbelegt. Prüfe vor Ort und bestätige sie.
          </p>
          <Button
            variant="secondary"
            onClick={() => void confirmPrefilled(db, assessment.id, prefilled)}
          >
            Alle vorbelegten bestätigen
          </Button>
        </Card>
      )}
      {visible.map(
        (section) =>
          section.items.length > 0 && (
            <section key={section.id} className="space-y-3">
              {section.title && <h2 className="text-xl font-bold">{section.title}</h2>}
              {section.items.map((item) => (
                <ItemField key={item.id} item={item} />
              ))}
            </section>
          ),
      )}
      {step.id === 'site' && <EmergencyCard />}
    </div>
  )
}
