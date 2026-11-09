import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { listCustomers } from '../../db/profiles'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LinkList, ListLink } from '../../components/ListLink'

export function CustomerListPage() {
  const org = useOrganization()
  const customers = useLiveQuery(
    async () => (org ? listCustomers(db, org.id) : undefined),
    [org?.id],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kunden und Objekte"
        back="/profile"
        backLabel="Profile"
        action={
          <Link
            to="/profile/kunden/neu"
            className="inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-500"
          >
            + Neu
          </Link>
        }
      />
      {customers === undefined ? (
        <p>Lädt …</p>
      ) : customers.length === 0 ? (
        <EmptyState>
          Noch keine Kunden. Lege z. B. Hausverwaltungen mit ihren Objekten an, dann sind Adressen
          beim Einsatz schon ausgefüllt.
        </EmptyState>
      ) : (
        <LinkList>
          {customers.map((c) => (
            <ListLink
              key={c.id}
              to={`/profile/kunden/${c.id}`}
              title={c.name}
              meta={[c.city, c.sites.length === 1 ? '1 Objekt' : `${c.sites.length} Objekte`]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </LinkList>
      )}
    </div>
  )
}
