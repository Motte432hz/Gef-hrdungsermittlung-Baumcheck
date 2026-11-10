import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getTrees, setAnswer, setTreeAnswer, updateAssessment } from '../db/repo'
import { getDefinition } from '../form/definition'
import { validateAssessment } from '../form/validation'
import type { Assessment, Tree } from '../domain/types'
import { WizardContext, type WizardContextValue } from './WizardContext'
import { stepState, SUMMARY_STEP_ID, wizardSteps, type StepState, type WizardStep } from './steps'
import { StepView } from './StepView'
import { SummaryStep } from './SummaryStep'
import { OnlineBadge } from '../components/OnlineBadge'
import { useOrganization } from '../app/useOrganization'
import { neighbour } from './navigation'

export function WizardPage() {
  const { id, stepId } = useParams()
  const data = useLiveQuery(async () => {
    const assessment = await db.assessments.get(id!)
    if (!assessment) return null
    return { assessment, trees: await getTrees(db, assessment.id) }
  }, [id])

  if (data === undefined) return <p className="p-4">Lädt …</p>
  if (data === null) return <Navigate to="/" replace />
  if (data.assessment.status !== 'draft')
    return <Navigate to={`/protokoll/${data.assessment.id}`} replace />
  return <Wizard assessment={data.assessment} trees={data.trees} stepId={stepId} />
}

const stateIcon: Record<StepState, { icon: string; label: string; cls: string }> = {
  done: { icon: '✓', label: 'vollständig', cls: 'bg-brand-700 text-white' },
  open: {
    icon: '•',
    label: 'offen',
    cls: 'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-100',
  },
  warning: { icon: '!', label: 'mit Warnung', cls: 'bg-amber-500 text-black' },
}

function StepBadge({ state, n }: { state: StepState; n: number }) {
  const s = stateIcon[state]
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.cls}`}
    >
      <span aria-hidden="true">{state === 'open' ? n : s.icon}</span>
      <span className="sr-only">{s.label}</span>
    </span>
  )
}

function StepList({
  steps,
  current,
  states,
  assessmentId,
  onPick,
}: {
  steps: WizardStep[]
  current: string
  states: Record<string, StepState>
  assessmentId: string
  onPick?: () => void
}) {
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => (
        <li key={s.id}>
          <Link
            to={`/einsatz/${assessmentId}/${s.id}`}
            onClick={onPick}
            aria-current={s.id === current ? 'step' : undefined}
            className={`flex min-h-12 items-center gap-3 rounded-xl px-2 font-semibold ${
              s.id === current
                ? 'bg-brand-50 text-brand-900 dark:bg-brand-900 dark:text-brand-50'
                : 'hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <StepBadge state={states[s.id] ?? 'open'} n={i + 1} />
            {s.title}
          </Link>
        </li>
      ))}
    </ol>
  )
}

function Wizard({
  assessment,
  trees,
  stepId,
}: {
  assessment: Assessment
  trees: Tree[]
  stepId?: string
}) {
  const navigate = useNavigate()
  const org = useOrganization()
  const branded = !!(org?.brandInApp && org.brandColor)
  const definition = getDefinition(assessment.formVersion)
  const steps = wizardSteps(definition)
  const index = Math.max(
    0,
    steps.findIndex((s) => s.id === stepId),
  )
  const step = steps[index]!
  const [menuOpen, setMenuOpen] = useState(false)
  const [params] = useSearchParams()
  const treeParam = params.get('baum') ?? undefined
  const [saveError, setSaveError] = useState(false)

  /** Autosave wrapper: a failed write must never go unnoticed. */
  const guard = async (write: Promise<void>) => {
    try {
      await write
      setSaveError(false)
    } catch (err) {
      console.error(err)
      setSaveError(true)
    }
  }

  const issues = validateAssessment({ definition, assessment, trees })
  const states = Object.fromEntries(
    steps.map((s) => [
      s.id,
      s.id === SUMMARY_STEP_ID
        ? issues.length
          ? 'open'
          : 'done'
        : // Per-tree steps are never complete without a tree.
          s.formStep?.repeat === 'tree' && trees.length === 0
          ? 'open'
          : stepState(s.id, issues),
    ]),
  ) as Record<string, StepState>

  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [step.id])

  const ctx: WizardContextValue = {
    definition,
    assessment,
    trees,
    issues,
    setAnswer: (itemId, answer, treeId) =>
      guard(
        treeId
          ? setTreeAnswer(db, treeId, itemId, answer)
          : setAnswer(db, assessment.id, itemId, answer),
      ),
    update: (changes) => guard(updateAssessment(db, assessment.id, changes)),
  }

  if (stepId !== step.id) return <Navigate to={`/einsatz/${assessment.id}/${step.id}`} replace />

  const go = (direction: 1 | -1) => {
    const target = neighbour(
      steps,
      { stepId: step.id, treeId: treeParam ?? trees[0]?.id },
      trees.map((t) => t.id),
      direction,
    )
    if (target) {
      navigate(
        `/einsatz/${assessment.id}/${target.stepId}${target.treeId ? `?baum=${target.treeId}` : ''}`,
      )
    }
  }

  return (
    <WizardContext.Provider value={ctx}>
      <div className="min-h-dvh md:flex">
        <aside className="hidden w-72 shrink-0 border-r border-stone-200 bg-white p-3 md:block dark:border-stone-800 dark:bg-stone-900">
          <div className="sticky top-3">
            <p className="mb-3 px-2 text-sm font-semibold text-stone-600 dark:text-stone-400">
              Schritte
            </p>
            <StepList
              steps={steps}
              current={step.id}
              states={states}
              assessmentId={assessment.id}
            />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="pt-safe sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
            <div
              className={`flex min-h-14 items-center gap-2 px-2 ${branded ? 'bg-brand-700 text-white dark:bg-brand-900' : ''}`}
            >
              <Link
                to="/"
                aria-label="Assistent schließen"
                className={`flex size-12 items-center justify-center rounded-full text-2xl ${branded ? 'hover:bg-white/15' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`}
              >
                ×
              </Link>
              <button
                type="button"
                className="flex min-h-12 flex-1 items-center gap-2 rounded-xl px-2 text-left md:pointer-events-none"
                aria-expanded={menuOpen}
                aria-controls="step-menu"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span className="min-w-0">
                  <span
                    className={`block text-sm ${branded ? 'text-white/80' : 'text-stone-600 dark:text-stone-400'}`}
                  >
                    Schritt {index + 1} von {steps.length}
                  </span>
                  <span className="block truncate text-lg font-bold">{step.title}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`ml-auto md:hidden ${branded ? 'text-white/80' : 'text-stone-500'}`}
                >
                  {menuOpen ? '▴' : '▾'}
                </span>
              </button>
              <OnlineBadge />
            </div>
            <div className="h-1 bg-stone-200 dark:bg-stone-800">
              <div
                className="h-1 bg-accent-500 transition-all"
                style={{ width: `${((index + 1) / steps.length) * 100}%` }}
              />
            </div>
            {menuOpen && (
              <div
                id="step-menu"
                className="max-h-[70dvh] overflow-y-auto border-t border-stone-200 p-2 md:hidden dark:border-stone-800"
              >
                <StepList
                  steps={steps}
                  current={step.id}
                  states={states}
                  assessmentId={assessment.id}
                  onPick={() => setMenuOpen(false)}
                />
              </div>
            )}
          </header>

          <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-32">
            {saveError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border-l-4 border-red-700 bg-red-50 p-3 font-semibold text-red-950 dark:bg-red-950 dark:text-red-50"
              >
                Die letzte Eingabe konnte nicht gespeichert werden. Bitte erneut versuchen.
              </div>
            )}
            {step.formStep ? <StepView key={step.id} step={step.formStep} /> : <SummaryStep />}
          </main>

          <nav
            aria-label="Schritte"
            className="pb-safe fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white md:left-72 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="mx-auto flex max-w-3xl gap-3 p-3">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={index === 0}
                className="min-h-14 flex-1 rounded-xl border-2 border-stone-300 font-semibold disabled:opacity-40 dark:border-stone-600"
              >
                ‹ Zurück
              </button>
              {index < steps.length - 1 && (
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="min-h-14 flex-[2] rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-500"
                >
                  Weiter ›
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>
    </WizardContext.Provider>
  )
}
