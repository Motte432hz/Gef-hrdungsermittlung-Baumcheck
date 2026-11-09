import { Link } from 'react-router'
import { canComplete, type Issue, type IssueLevel } from '../form/validation'
import { useWizard } from './WizardContext'
import { wizardSteps } from './steps'
import { itemAnchor } from './anchors'
import { Card } from '../components/Card'
import { Notice } from './inputs/Notice'

const levelOrder: IssueLevel[] = ['danger', 'blocking', 'warning', 'info']
const levelTitle: Record<IssueLevel, string> = {
  danger: 'Achtung',
  blocking: 'Noch offen',
  warning: 'Warnungen',
  info: 'Hinweise',
}

export function SummaryStep() {
  const { definition, assessment, issues } = useWizard()
  const steps = wizardSteps(definition)
  const stepTitle = (id: string) => steps.find((s) => s.id === id)?.title ?? id
  const ready = canComplete(issues)

  const link = (i: Issue) =>
    `/einsatz/${assessment.id}/${i.stepId}${i.itemId ? `#${itemAnchor(i.itemId, i.treeId)}` : ''}`

  return (
    <div className="space-y-4">
      {ready ? (
        <Notice level="info">
          Alle Pflichtangaben sind ausgefüllt. Unterschriften und PDF folgen im nächsten
          Ausbauschritt.
        </Notice>
      ) : (
        <p className="text-stone-700 dark:text-stone-300">
          Tippe auf einen Punkt, um direkt dorthin zu springen.
        </p>
      )}
      {levelOrder.map((level) => {
        const list = issues.filter((i) => i.level === level)
        if (list.length === 0) return null
        return (
          <Card key={level} title={`${levelTitle[level]} (${list.length})`}>
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {list.map((i) => (
                <li key={i.key}>
                  <Link
                    to={link(i)}
                    className="flex min-h-14 items-center justify-between gap-3 py-2"
                  >
                    <span>
                      <span className="block text-sm text-stone-600 dark:text-stone-400">
                        {stepTitle(i.stepId)}
                        {i.treeIndex !== undefined && ` · Baum ${i.treeIndex + 1}`}
                      </span>
                      <span className="block font-semibold">{i.message}</span>
                    </span>
                    <span aria-hidden="true" className="text-2xl text-stone-400">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
