import type { WizardStep } from './steps'

export interface NavTarget {
  stepId: string
  treeId?: string
}

/**
 * Next/previous position in the wizard. The per-tree steps are walked tree by tree:
 * Baum 1 (Daten → Beurteilung) → Baum 2 (Daten → Beurteilung) → … → next step.
 */
export function neighbour(
  steps: WizardStep[],
  current: NavTarget,
  treeIds: string[],
  direction: 1 | -1,
): NavTarget | undefined {
  const index = steps.findIndex((s) => s.id === current.stepId)
  const treeSteps = steps.filter((s) => s.formStep?.repeat === 'tree').map((s) => s.id)
  const inTree = treeSteps.includes(current.stepId)

  if (inTree && treeIds.length > 0) {
    const t = Math.max(0, treeIds.indexOf(current.treeId ?? treeIds[0]!))
    const s = treeSteps.indexOf(current.stepId)
    const nextS = s + direction
    if (nextS >= 0 && nextS < treeSteps.length)
      return { stepId: treeSteps[nextS]!, treeId: treeIds[t] }
    const nextT = t + direction
    if (nextT >= 0 && nextT < treeIds.length) {
      return {
        stepId: direction === 1 ? treeSteps[0]! : treeSteps[treeSteps.length - 1]!,
        treeId: treeIds[nextT],
      }
    }
  }

  const target = steps[index + direction]
  if (!target) return undefined
  // Entering the tree block from outside: first tree going forward, last tree going back.
  if (target.formStep?.repeat === 'tree' && treeIds.length > 0) {
    const entry = direction === 1 ? steps.find((s) => s.formStep?.repeat === 'tree')! : target
    return { stepId: entry.id, treeId: direction === 1 ? treeIds[0] : treeIds[treeIds.length - 1] }
  }
  return { stepId: target.id }
}
