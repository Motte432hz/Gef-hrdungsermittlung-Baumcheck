import type { FormDefinition, FormStep } from '../form/schema'
import type { Issue } from '../form/validation'

export const SUMMARY_STEP_ID = 'summary'

export interface WizardStep {
  id: string
  title: string
  shortTitle: string
  formStep?: FormStep
}

/** Form steps plus the final summary step. */
export function wizardSteps(def: FormDefinition): WizardStep[] {
  return [
    ...def.steps.map((s) => ({ id: s.id, title: s.title, shortTitle: s.shortTitle, formStep: s })),
    { id: SUMMARY_STEP_ID, title: 'Prüfen & Abschließen', shortTitle: 'Prüfen' },
  ]
}

export type StepState = 'done' | 'open' | 'warning'

/** done = nothing missing; open = blocking issues; warning = only warnings left. */
export function stepState(stepId: string, issues: Issue[]): StepState {
  const own = issues.filter((i) => i.stepId === stepId)
  if (own.some((i) => i.level === 'blocking')) return 'open'
  if (own.some((i) => i.level === 'danger' || i.level === 'warning')) return 'warning'
  return 'done'
}
