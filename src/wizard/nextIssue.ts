import type { Issue } from '../form/validation'
import { itemAnchor } from './anchors'

/** Issues that still prevent completion. */
export const openIssues = (issues: Issue[]) => issues.filter((i) => i.level === 'blocking')

export interface WizardPosition {
  stepId: string
  treeId?: string
}

/**
 * The next open point from where the user is: first in the current step (and tree), then in
 * the following steps; after the last one it starts again at the beginning.
 */
export function nextIssue(
  issues: Issue[],
  stepIds: string[],
  treeIds: string[],
  current: WizardPosition,
): Issue | undefined {
  const pos = (stepId: string, treeId?: string) =>
    [stepIds.indexOf(stepId), treeId ? treeIds.indexOf(treeId) : -1] as const
  const before = (a: readonly [number, number], b: readonly [number, number]) =>
    a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])
  const here = pos(current.stepId, current.treeId)
  const open = openIssues(issues)
    .map((issue, order) => ({ issue, order, at: pos(issue.stepId, issue.treeId) }))
    .sort((x, y) => (before(x.at, y.at) ? -1 : before(y.at, x.at) ? 1 : x.order - y.order))
  // On a tree step, the step's general issues (e.g. "no tree yet") count as "here".
  const ahead = open.find((x) => !before(x.at, here) || (x.at[0] === here[0] && x.at[1] === -1))
  return (ahead ?? open[0])?.issue
}

/** Wizard address of an issue (step, tree and item anchor). */
export function issuePath(
  assessmentId: string,
  issue: Pick<Issue, 'stepId' | 'treeId' | 'itemId'>,
) {
  const { stepId, treeId, itemId } = issue
  return `/einsatz/${assessmentId}/${stepId}${treeId ? `?baum=${treeId}` : ''}${itemId ? `#${itemAnchor(itemId, treeId)}` : ''}`
}
