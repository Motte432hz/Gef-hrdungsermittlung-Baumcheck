import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { listCustomers } from '../db/profiles'
import { useOrganization } from '../app/useOrganization'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, LinkList, ListLink } from '../components/ListLink'
import { TextField } from '../components/form/Field'
import { assessmentTitle, formatDateDe } from '../wizard/draftInfo'
import { matches, searchText } from './archiveSearch'

export function ArchivePage() {
  const org = useOrganization()
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const list = useLiveQuery(async () => {
    if (!org) return undefined
    const [all, customers, trees] = await Promise.all([
      db.assessments.where('organizationId').equals(org.id).toArray(),
      listCustomers(db, org.id),
      db.trees.where('organizationId').equals(org.id).toArray(),
    ])
    return all
      .filter((a) => a.status !== 'draft')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .map((a) => ({
        id: a.id,
        number: a.protocolNumber,
        title: assessmentTitle(a, customers),
        date: a.date,
        sent: a.status === 'sent',
        text: searchText(
          a,
          customers,
          trees.filter((t) => t.assessmentId === a.id),
        ),
      }))
  }, [org?.id])

  const filtered = list?.filter(
    (p) => matches(p.text, query) && (!from || p.date >= from) && (!to || p.date <= to),
  )
  const filtering = !!(query.trim() || from || to)

  return (
    <div className="space-y-4">
      <PageHeader title="Archiv" />
      {list && list.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <TextField
            label="Suchen"
            type="search"
            placeholder="Nummer, Kunde, Objekt, Adresse, Person, Baumart …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Einsatz von"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <TextField label="bis" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}
      {filtered === undefined ? (
        <p>Lädt …</p>
      ) : list!.length === 0 ? (
        <EmptyState>Noch keine abgeschlossenen Protokolle.</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>Keine Protokolle gefunden.</EmptyState>
      ) : (
        <>
          {filtering && (
            <p role="status" className="text-stone-600 dark:text-stone-400">
              {filtered.length} von {list!.length} Protokollen
            </p>
          )}
          <LinkList>
            {filtered.map((p) => (
              <ListLink
                key={p.id}
                to={`/protokoll/${p.id}`}
                title={`${p.number} · ${p.title}`}
                meta={`${formatDateDe(p.date)} · ${p.sent ? 'versendet' : 'abgeschlossen'}`}
              />
            ))}
          </LinkList>
        </>
      )}
    </div>
  )
}
