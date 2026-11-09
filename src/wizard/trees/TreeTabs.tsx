import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { addTree } from '../../db/repo'
import { useWizard } from '../WizardContext'
import { treeLabel } from './treeLabel'

export function TreeTabs({ stepId, currentTreeId }: { stepId: string; currentTreeId?: string }) {
  const { assessment, trees, issues } = useWizard()
  const navigate = useNavigate()

  const add = async () => {
    const t = await addTree(db, assessment.id)
    // New trees always start with the basic data.
    navigate(`/einsatz/${assessment.id}/tree?baum=${t.id}`)
  }

  return (
    <nav aria-label="Bäume" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex gap-2">
        {trees.map((t) => {
          const open = issues.some(
            (i) => i.treeId === t.id && i.stepId === stepId && i.level === 'blocking',
          )
          const current = t.id === currentTreeId
          return (
            <li key={t.id} className="shrink-0">
              <button
                type="button"
                aria-current={current ? 'page' : undefined}
                onClick={() => navigate(`/einsatz/${assessment.id}/${stepId}?baum=${t.id}`)}
                className={`flex min-h-12 items-center gap-2 rounded-full border-2 px-4 font-semibold whitespace-nowrap ${
                  current
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900'
                }`}
              >
                {treeLabel(t)}
                {open && (
                  <span
                    className="size-2.5 rounded-full bg-amber-500"
                    aria-label="noch offen"
                    role="img"
                  />
                )}
              </button>
            </li>
          )
        })}
        <li className="shrink-0">
          <button
            type="button"
            onClick={() => void add()}
            className="flex min-h-12 items-center rounded-full border-2 border-dashed border-brand-700 px-4 font-semibold whitespace-nowrap text-brand-700 dark:border-brand-300 dark:text-brand-300"
          >
            + Baum
          </button>
        </li>
      </ul>
    </nav>
  )
}
