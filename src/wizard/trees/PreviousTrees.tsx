import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { addTreeFromPrevious } from '../../db/repo'
import type { Tree } from '../../domain/types'
import { useWizard } from '../WizardContext'
import { treeLabel } from './treeLabel'
import { lastAssessmentOf, previousTreesFor, type PreviousTree } from './previousTrees'
import { Button } from '../../components/Button'

const date = (iso: string) => iso.split('-').reverse().join('.')
const distance = (m?: number) =>
  m === undefined
    ? ''
    : m < 1000
      ? ` · ${m} m entfernt`
      : ` · ${(m / 1000).toFixed(1).replace('.', ',')} km entfernt`

function Findings({ p }: { p: PreviousTree }) {
  return (
    <>
      <p className="text-sm">
        Ergebnis: <strong>{p.result ?? '–'}</strong>
      </p>
      {p.findings.length > 0 && (
        <ul className="list-disc pl-5 text-sm">
          {p.findings.map((f) => (
            <li key={f.itemId}>
              {f.label}
              {f.detail ? ` (${f.detail})` : ''}
              {f.note ? ` – Maßnahme: ${f.note}` : ''}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** Trees of the last assessment at this object, ready to be taken over. */
export function PreviousTrees() {
  const { assessment, trees } = useWizard()
  const navigate = useNavigate()
  const list = useLiveQuery(
    () => previousTreesFor(db, assessment, trees, assessment.position),
    [assessment, trees],
  )
  if (!list || list.length === 0) return null

  const take = async (p: PreviousTree) => {
    const t = await addTreeFromPrevious(db, assessment.id, p.tree)
    navigate(`/einsatz/${assessment.id}/tree?baum=${t.id}`)
  }

  return (
    <details
      open={trees.length === 0}
      className="rounded-2xl border-2 border-sky-700 bg-sky-50 p-3 text-sky-950 dark:bg-sky-950 dark:text-sky-50"
    >
      <summary className="min-h-12 cursor-pointer py-2 font-semibold">
        Bäume vom letzten Einsatz hier ({list.length}) – {date(list[0]!.date)}
      </summary>
      <ul aria-label="Bäume vom letzten Einsatz" className="mt-2 space-y-2">
        {list.map((p) => (
          <li
            key={p.tree.id}
            className="space-y-1 rounded-xl bg-white p-3 text-stone-900 dark:bg-stone-900 dark:text-stone-100"
          >
            <p className="font-semibold">
              {treeLabel(p.tree)}
              <span className="font-normal text-stone-600 dark:text-stone-400">
                {distance(p.distanceM)}
              </span>
            </p>
            <Findings p={p} />
            <Button variant="secondary" onClick={() => void take(p)}>
              Diesen Baum übernehmen
            </Button>
          </li>
        ))}
      </ul>
    </details>
  )
}

/** On the assessment step: what was found at this tree last time. */
export function LastFindings({ tree }: { tree: Tree }) {
  const last = useLiveQuery(() => lastAssessmentOf(db, tree), [tree.previousTreeId])
  if (!last) return null
  return (
    <section
      aria-label="Letzter Befund"
      className="space-y-1 rounded-2xl border-l-4 border-sky-700 bg-sky-50 p-3 text-sky-950 dark:bg-sky-950 dark:text-sky-50"
    >
      <p className="font-semibold">
        Letzter Befund ({date(last.date)}
        {last.protocolNumber ? ` · ${last.protocolNumber}` : ''}) – bitte auf Veränderungen achten
      </p>
      <Findings p={last} />
      {last.findings.length === 0 && <p className="text-sm">Damals keine Auffälligkeiten.</p>}
    </section>
  )
}
