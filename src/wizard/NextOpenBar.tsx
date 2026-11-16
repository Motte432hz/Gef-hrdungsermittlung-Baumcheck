import { useNavigate } from 'react-router'
import type { Issue } from '../form/validation'
import { itemAnchor } from './anchors'
import { issuePath, nextIssue, openIssues, type WizardPosition } from './nextIssue'
import { SUMMARY_STEP_ID } from './steps'

/** "Noch 4 offen – Nächster ›": jumps to the next open point across all steps. */
export function NextOpenBar({
  assessmentId,
  issues,
  stepIds,
  treeIds,
  current,
}: {
  assessmentId: string
  issues: Issue[]
  stepIds: string[]
  treeIds: string[]
  current: WizardPosition
}) {
  const navigate = useNavigate()
  const count = openIssues(issues).length
  // The summary lists the open points itself.
  if (current.stepId === SUMMARY_STEP_ID) return null

  if (count === 0)
    return (
      <div className="flex min-h-11 items-center justify-between gap-3 px-3 pt-2">
        <p className="font-semibold text-brand-700 dark:text-brand-300">
          ✓ Alles Nötige ausgefüllt
        </p>
        <button
          type="button"
          onClick={() => navigate(`/einsatz/${assessmentId}/${SUMMARY_STEP_ID}`)}
          className="min-h-11 rounded-xl px-3 font-semibold text-brand-700 underline dark:text-brand-300"
        >
          Zum Abschluss ›
        </button>
      </div>
    )

  const go = () => {
    const target = nextIssue(issues, stepIds, treeIds, current)
    if (!target) return
    const sameView =
      target.stepId === current.stepId && (target.treeId ?? '') === (current.treeId ?? '')
    const el = target.itemId && document.getElementById(itemAnchor(target.itemId, target.treeId))
    if (sameView && el) {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' })
      el.querySelector<HTMLElement>('input, textarea, select, button')?.focus({
        preventScroll: true,
      })
    } else navigate(issuePath(assessmentId, target))
  }

  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3 pt-2">
      <p className="text-stone-700 dark:text-stone-300">
        Noch <strong>{count}</strong> offen
      </p>
      <button
        type="button"
        onClick={go}
        className="min-h-11 rounded-xl bg-accent-500/15 px-3 font-semibold whitespace-nowrap text-stone-900 dark:text-stone-100"
      >
        Nächster offener ›
      </button>
    </div>
  )
}
