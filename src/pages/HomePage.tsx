import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { db } from '../db/db'
import { deleteDraft, getTrees } from '../db/repo'
import { listCustomers } from '../db/profiles'
import { getDefinition } from '../form/definition'
import { validateAssessment } from '../form/validation'
import { useOrganization } from '../app/useOrganization'
import { Button } from '../components/Button'
import { Card, PageTitle } from '../components/Card'
import { InstallHint } from '../components/InstallHint'
import { BackupReminder } from '../components/BackupReminder'
import { startAssessment } from '../wizard/start'
import { useCloudRights } from '../cloud/useCloudRights'
import { assessmentTitle, formatDateDe } from '../wizard/draftInfo'

export function HomePage() {
  const org = useOrganization()
  const rights = useCloudRights()
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)

  const drafts = useLiveQuery(async () => {
    if (!org) return undefined
    const [list, customers] = await Promise.all([
      db.assessments.where('status').equals('draft').toArray(),
      listCustomers(db, org.id),
    ])
    const sorted = list
      .filter((a) => a.organizationId === org.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return Promise.all(
      sorted.map(async (a) => {
        const trees = await getTrees(db, a.id)
        const issues = validateAssessment({
          definition: getDefinition(a.formVersion),
          assessment: a,
          trees,
        })
        return {
          id: a.id,
          title: assessmentTitle(a, customers),
          date: formatDateDe(a.date),
          open: issues.filter((i) => i.level === 'blocking').length,
          createdBy: a.createdBy,
        }
      }),
    )
  }, [org?.id])

  const start = async () => {
    if (!org || starting) return
    setStarting(true)
    const a = await startAssessment(db, org.id)
    navigate(`/einsatz/${a.id}/job`)
  }

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Entwurf „${title}“ wirklich löschen?`)) return
    await deleteDraft(db, id)
  }

  return (
    <div className="space-y-4">
      <PageTitle>Gefährdungsermittlung</PageTitle>

      <BackupReminder />

      <Button
        className="min-h-16 w-full text-lg"
        onClick={() => void start()}
        disabled={!org || starting}
      >
        + Neue Gefährdungsermittlung
      </Button>

      <Card title="Entwürfe">
        {drafts === undefined ? (
          <p>Lädt …</p>
        ) : drafts.length === 0 ? (
          <p className="text-stone-600 dark:text-stone-400">Noch keine angefangenen Einsätze.</p>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <Link to={`/einsatz/${d.id}/job`} className="min-h-16 min-w-0 flex-1 py-2">
                  <span className="block truncate font-semibold">{d.title}</span>
                  <span className="block text-sm text-stone-600 dark:text-stone-400">
                    {d.date} · {d.open === 0 ? 'bereit zum Abschluss' : `${d.open} offene Punkte`}
                  </span>
                </Link>
                {rights.canDelete(d, 'draft') && (
                  <button
                    type="button"
                    onClick={() => void remove(d.id, d.title)}
                    aria-label={`Entwurf ${d.title} löschen`}
                    className="flex size-12 items-center justify-center rounded-full text-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    🗑
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <InstallHint />
    </div>
  )
}
