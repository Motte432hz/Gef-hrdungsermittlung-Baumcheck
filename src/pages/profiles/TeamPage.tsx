import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { listCompanies, listWorkers } from '../../db/profiles'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LinkList, ListLink } from '../../components/ListLink'
import { TextField } from '../../components/form/Field'
import { Segmented } from '../../components/form/Segmented'
import type { Worker } from '../../domain/types'
import { personLabel } from '../../domain/people'
import { qualificationSummary } from '../../domain/qualifications'
import { searchKey } from '../../wizard/special/teamOps'
import { companyPath, personPath } from './teamPaths'
import { DueNotice } from './DueDatesPage'

type Filter = 'all' | 'own' | 'sub'

const actionClass = 'flex min-h-12 flex-1 items-center justify-center rounded-xl px-4 font-semibold'

/** Own staff and subcontractor companies with their people in one place. */
export function TeamPage() {
  const org = useOrganization()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const data = useLiveQuery(async () => {
    if (!org) return undefined
    const [workers, companies] = await Promise.all([
      listWorkers(db, org.id),
      listCompanies(db, org.id),
    ])
    return { workers, companies }
  }, [org?.id])

  if (!data) return <p>Lädt …</p>
  const q = searchKey(query)
  const hit = (w: Worker) =>
    !q || searchKey(`${personLabel(w)} ${w.company ?? ''} ${qualificationSummary(w)}`).includes(q)
  const own = filter === 'sub' ? [] : data.workers.filter((w) => w.kind === 'employee' && hit(w))
  const subs = data.workers.filter((w) => w.kind === 'subcontractor')
  const groups =
    filter === 'own'
      ? []
      : data.companies
          .map((c) => ({
            company: c,
            people: subs.filter((w) => w.companyId === c.id && hit(w)),
          }))
          .filter((g) => g.people.length > 0 || !q || searchKey(g.company.name).includes(q))
  const loose = filter === 'own' ? [] : subs.filter((w) => !w.companyId && hit(w))
  const empty = data.workers.length === 0 && data.companies.length === 0

  const personLink = (w: Worker) => (
    <ListLink
      key={w.id}
      to={personPath(w.id)}
      title={
        <>
          {personLabel(w)}
          {!w.active && <span className="font-normal text-stone-500"> (inaktiv)</span>}
        </>
      }
      meta={qualificationSummary(w)}
    />
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Team & Partner" back="/profile" backLabel="Profile" />
      <DueNotice within={60} />
      <Link
        to="/profile/team/fristen"
        className="inline-flex min-h-12 items-center font-semibold text-brand-700 underline dark:text-brand-300"
      >
        Fristen: Nachweise & PSA-Prüfungen ›
      </Link>
      <div className="flex gap-2">
        <Link to={personPath('neu')} className={`${actionClass} bg-brand-700 text-white`}>
          + Person
        </Link>
        <Link
          to={companyPath('neu')}
          className={`${actionClass} border-2 border-brand-700 text-brand-700 dark:border-brand-300 dark:text-brand-300`}
        >
          + Subunternehmer
        </Link>
      </div>

      {empty ? (
        <EmptyState>
          Noch niemand angelegt. Lege deine Mitarbeiter und Subunternehmer an – oder erfasse sie
          direkt im Einsatz, sie werden dann hier gespeichert.
        </EmptyState>
      ) : (
        <>
          <TextField
            label="Suchen"
            type="search"
            placeholder="Name, Firma oder Qualifikation"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Segmented<Filter>
            label="Anzeigen"
            options={[
              { value: 'all', label: 'Alle' },
              { value: 'own', label: 'Eigene' },
              // Soft hyphens: wraps nicely on narrow phones.
              { value: 'sub', label: 'Sub\u00adunter\u00adnehmer' },
            ]}
            value={filter}
            onChange={setFilter}
          />

          {own.length > 0 && (
            <section aria-label="Eigene Firma" className="space-y-2">
              <h2 className="text-lg font-bold">
                {org?.name ? `${org.name} (eigene Firma)` : 'Eigene Firma'}
              </h2>
              <LinkList>{own.map(personLink)}</LinkList>
            </section>
          )}

          {groups.map(({ company, people }) => (
            <section key={company.id} aria-label={company.name} className="space-y-2">
              <Link
                to={companyPath(company.id)}
                className="flex min-h-12 items-center justify-between gap-2 rounded-xl px-1 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <span>
                  <span className="block text-lg font-bold">{company.name}</span>
                  <span className="block text-sm text-stone-600 dark:text-stone-400">
                    Subunternehmer · {people.length} {people.length === 1 ? 'Person' : 'Personen'}
                    {company.phone ? ` · ${company.phone}` : ''}
                  </span>
                </span>
                <span aria-hidden="true" className="text-2xl text-stone-400">
                  ›
                </span>
              </Link>
              {people.length > 0 && <LinkList>{people.map(personLink)}</LinkList>}
            </section>
          ))}

          {loose.length > 0 && (
            <section aria-label="Subunternehmer ohne Firma" className="space-y-2">
              <h2 className="text-lg font-bold">Subunternehmer ohne Firma</h2>
              <LinkList>{loose.map(personLink)}</LinkList>
            </section>
          )}

          {q && own.length === 0 && groups.length === 0 && loose.length === 0 && (
            <EmptyState>
              Niemand gefunden.{' '}
              <Link
                to={`${personPath('neu')}?name=${encodeURIComponent(query.trim())}`}
                className="font-semibold text-brand-700 underline dark:text-brand-300"
              >
                „{query.trim()}“ neu anlegen
              </Link>
            </EmptyState>
          )}
        </>
      )}
    </div>
  )
}
