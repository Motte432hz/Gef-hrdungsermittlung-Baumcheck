import { createContext, useContext } from 'react'
import type { Answer, Assessment, Tree } from '../domain/types'
import type { FormDefinition } from '../form/schema'
import type { Issue } from '../form/validation'

export interface WizardContextValue {
  definition: FormDefinition
  assessment: Assessment
  trees: Tree[]
  issues: Issue[]
  /** Writes an answer immediately (autosave). treeId for per-tree items. */
  setAnswer: (itemId: string, answer: Answer | undefined, treeId?: string) => Promise<void>
  /** Writes several answers in one go (gates clear the hazards of their section). */
  setAnswers: (changes: Record<string, Answer | undefined>, treeId?: string) => Promise<void>
  update: (changes: Partial<Assessment>) => Promise<void>
}

export const WizardContext = createContext<WizardContextValue | null>(null)

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard outside WizardContext')
  return ctx
}
