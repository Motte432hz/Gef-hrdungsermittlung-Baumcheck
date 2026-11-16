import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { deletePractice } from '../../db/repo'
import { Card } from '../../components/Card'
import { formatDateDe } from '../../wizard/draftInfo'

export function PracticeBadge() {
  return (
    <span className="mr-2 inline-block rounded-md bg-amber-100 px-1.5 py-0.5 align-middle text-xs font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
      Übung
    </span>
  )
}

/** Completed practice runs: look at the result, then delete. */
export function PracticeList() {
  const done = useLiveQuery(
    () => db.assessments.filter((a) => !!a.practice && a.status !== 'draft').toArray(),
    [],
  )
  if (!done?.length) return null
  return (
    <Card title="Abgeschlossene Übungen">
      <p className="mb-2 text-stone-700 dark:text-stone-300">
        Übungen kommen nicht ins Archiv und werden nicht versendet. Schau dir das PDF an und lösche
        die Übung danach.
      </p>
      <ul className="divide-y divide-stone-200 dark:divide-stone-800">
        {done.map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <Link to={`/protokoll/${a.id}`} className="min-h-14 min-w-0 flex-1 py-2 font-semibold">
              <PracticeBadge />
              Übungseinsatz vom {formatDateDe(a.date)}
            </Link>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Übung löschen?')) void deletePractice(db, a.id)
              }}
              aria-label={`Übung vom ${formatDateDe(a.date)} löschen`}
              className="flex size-12 items-center justify-center rounded-full text-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
