import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/ListLink'
import { dueText, DUE_SOON_DAYS } from '../../domain/dueDates'
import { useDueItems } from './useDueItems'
import { personLabel } from '../../domain/people'
import { personPath, TEAM_PATH } from './teamPaths'

const date = (iso: string) => iso.split('-').reverse().join('.')

export function DueDatesPage() {
  const data = useDueItems()
  if (!data) return <p>Lädt …</p>
  const groups = [
    {
      title: 'Überfällig',
      items: data.items.filter((i) => i.status === 'overdue'),
      cls: 'border-red-700',
    },
    {
      title: `In den nächsten ${DUE_SOON_DAYS} Tagen`,
      items: data.items.filter((i) => i.status === 'soon'),
      cls: 'border-amber-500',
    },
  ]
  return (
    <div className="space-y-4">
      <PageHeader title="Fristen" back={TEAM_PATH} backLabel="Team & Partner" />
      <p className="text-stone-700 dark:text-stone-300">
        Ablaufende Nachweise (z. B. SKT) und fällige PSA-Prüfungen aller aktiven Personen. Die Daten
        trägst du bei der Person unter „Weitere Angaben“ ein.
      </p>
      {data.items.length === 0 ? (
        <EmptyState>
          Alles in Ordnung – nichts überfällig und nichts in den nächsten {DUE_SOON_DAYS} Tagen
          fällig.
        </EmptyState>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.title} aria-label={g.title} className="space-y-2">
              <h2 className="text-lg font-bold">
                {g.title} ({g.items.length})
              </h2>
              <ul className="space-y-2">
                {g.items.map((i) => {
                  const w = data.workers.get(i.workerId)
                  return (
                    <li key={`${i.workerId}${i.label}`}>
                      <Link
                        to={personPath(i.workerId)}
                        className={`block rounded-xl border-l-4 bg-white p-3 hover:bg-stone-50 dark:bg-stone-900 dark:hover:bg-stone-800 ${g.cls}`}
                      >
                        <span className="block font-semibold">
                          {w ? personLabel(w) : 'Person'} · {i.label}
                        </span>
                        <span className="block text-sm text-stone-600 dark:text-stone-400">
                          {date(i.date)} – {dueText(i.days)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
      )}
    </div>
  )
}

/** Short notice with a link to the deadlines, e.g. on the start page. */
export function DueNotice({ within = 30 }: { within?: number }) {
  const data = useDueItems()
  if (!data) return null
  const overdue = data.items.filter((i) => i.status === 'overdue').length
  const soon = data.items.filter((i) => i.status === 'soon' && i.days <= within).length
  if (!overdue && !soon) return null
  return (
    <Link
      to={`${TEAM_PATH}/fristen`}
      className={`flex min-h-14 items-center justify-between gap-2 rounded-2xl border-l-4 px-4 py-2 font-semibold ${
        overdue
          ? 'border-red-700 bg-red-50 text-red-950 dark:bg-red-950 dark:text-red-50'
          : 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50'
      }`}
    >
      <span>
        ⚠ Fristen:{' '}
        {[overdue && `${overdue} überfällig`, soon && `${soon} bald fällig`]
          .filter(Boolean)
          .join(' · ')}
      </span>
      <span aria-hidden="true">›</span>
    </Link>
  )
}
