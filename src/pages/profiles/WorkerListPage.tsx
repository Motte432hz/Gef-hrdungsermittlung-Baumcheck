import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { listWorkers } from '../../db/profiles'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LinkList, ListLink } from '../../components/ListLink'
import type { PersonKind } from '../../domain/types'
import { qualificationSummary } from '../../domain/qualifications'
import { workerKinds } from './workerKinds'

export function WorkerListPage({ kind }: { kind: PersonKind }) {
  const org = useOrganization()
  const k = workerKinds[kind]
  const workers = useLiveQuery(
    async () => (org ? listWorkers(db, org.id, kind) : undefined),
    [org?.id, kind],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title={k.title}
        back="/profile"
        backLabel="Profile"
        action={
          <Link
            to={`${k.path}/neu`}
            className="inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-500"
          >
            + Neu
          </Link>
        }
      />
      {workers === undefined ? (
        <p>Lädt …</p>
      ) : workers.length === 0 ? (
        <EmptyState>{k.empty}</EmptyState>
      ) : (
        <LinkList>
          {workers.map((w) => (
            <ListLink
              key={w.id}
              to={`${k.path}/${w.id}`}
              title={
                <>
                  {w.name}
                  {!w.active && <span className="font-normal text-stone-500"> (inaktiv)</span>}
                </>
              }
              meta={[w.company, qualificationSummary(w)].filter(Boolean).join(' – ')}
            />
          ))}
        </LinkList>
      )}
    </div>
  )
}
