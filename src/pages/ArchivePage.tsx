import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { listCustomers } from '../db/profiles'
import { useOrganization } from '../app/useOrganization'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, LinkList, ListLink } from '../components/ListLink'
import { assessmentTitle, formatDateDe } from '../wizard/draftInfo'

export function ArchivePage() {
  const org = useOrganization()
  const list = useLiveQuery(async () => {
    if (!org) return undefined
    const [all, customers] = await Promise.all([
      db.assessments.where('organizationId').equals(org.id).toArray(),
      listCustomers(db, org.id),
    ])
    return all
      .filter((a) => a.status !== 'draft')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .map((a) => ({
        id: a.id,
        number: a.protocolNumber,
        title: assessmentTitle(a, customers),
        date: formatDateDe(a.date),
        sent: a.status === 'sent',
      }))
  }, [org?.id])

  return (
    <div className="space-y-4">
      <PageHeader title="Archiv" />
      {list === undefined ? (
        <p>Lädt …</p>
      ) : list.length === 0 ? (
        <EmptyState>Noch keine abgeschlossenen Protokolle.</EmptyState>
      ) : (
        <LinkList>
          {list.map((p) => (
            <ListLink
              key={p.id}
              to={`/protokoll/${p.id}`}
              title={`${p.number} · ${p.title}`}
              meta={`${p.date} · ${p.sent ? 'versendet' : 'abgeschlossen'}`}
            />
          ))}
        </LinkList>
      )}
    </div>
  )
}
