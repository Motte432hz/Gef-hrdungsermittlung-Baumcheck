import { useEffect } from 'react'
import { useLocation } from 'react-router'
import type { FormStep } from '../form/schema'
import { isItemVisible, makeLookup } from '../form/validation'
import { confirmPrefilled } from '../db/repo'
import { db } from '../db/db'
import { useWizard } from './WizardContext'
import { SectionView } from './SectionView'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmergencyCard } from './special/EmergencyCard'
import { TreeStepView } from './trees/TreeStepView'
import { StepIntro } from './StepIntro'
import { useOfferUndo } from '../components/undo/undo'
import { QuickStartButton } from './quick/QuickStartButton'
import { OneTimeTip } from '../help/OneTimeTip'
import { stepTips } from '../help/tips'

export function StepView({ step }: { step: FormStep }) {
  const { assessment, setAnswers } = useWizard()
  const offerUndo = useOfferUndo()
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

  if (step.repeat === 'tree') return <TreeStepView step={step} />

  const lookup = makeLookup(assessment.answers, undefined, assessment.date)
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
      {step.intro && <StepIntro text={step.intro} />}
      {stepTips[step.id] && <OneTimeTip {...stepTips[step.id]!} />}
      <QuickStartButton step={step} answers={assessment.answers} lookup={lookup} />
      {prefilled.length > 0 && (
        <Card>
          <p className="mb-3">
            {prefilled.length} {prefilled.length === 1 ? 'Punkt ist' : 'Punkte sind'} aus der
            Standard-Ausrüstung vorbelegt. Prüfe vor Ort und bestätige sie.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              const before = Object.fromEntries(prefilled.map((id) => [id, assessment.answers[id]]))
              void confirmPrefilled(db, assessment.id, prefilled).then(() =>
                offerUndo({
                  message: `${prefilled.length} vorbelegte Punkte bestätigt.`,
                  undo: () => setAnswers(before),
                }),
              )
            }}
          >
            Alle vorbelegten bestätigen
          </Button>
        </Card>
      )}
      {step.sections.map((section) => (
        <SectionView
          key={section.id}
          section={section}
          lookup={lookup}
          answers={assessment.answers}
        />
      ))}
      {step.id === 'site' && <EmergencyCard />}
    </div>
  )
}
