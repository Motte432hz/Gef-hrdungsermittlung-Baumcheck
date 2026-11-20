import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { db } from '../db/db'
import { deleteDraft, deletePractice, getTrees } from '../db/repo'
import { listCustomers } from '../db/profiles'
import { getDefinition } from '../form/definition'
import { validateAssessment } from '../form/validation'
import { useOrganization } from '../app/useOrganization'
import { Button } from '../components/Button'
import { Card, PageTitle } from '../components/Card'
import { InstallHint } from '../components/InstallHint'
import { BackupReminder } from '../components/BackupReminder'
import { DueNotice } from './profiles/DueDatesPage'
import { startAssessment } from '../wizard/start'
import { useCloudRights } from '../cloud/useCloudRights'
import { assessmentTitle, formatDateDe } from '../wizard/draftInfo'
import { issuePath } from '../wizard/nextIssue'
import { SUMMARY_STEP_ID, wizardSteps } from '../wizard/steps'
import { SetupCards } from './home/SetupCards'
import { templateSummary } from './templates/templateText'
import type { JobTemplate } from '../domain/types'
import { PracticeBadge, PracticeList } from './home/PracticeList'

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
        const definition = getDefinition(a.formVersion)
        const issues = validateAssessment({ definition, assessment: a, trees })
        // Continue where something is still missing, otherwise at the summary.
        const next = issues.find((i) => i.level === 'blocking')
        const steps = wizardSteps(definition)
        return {
          resume: next ? issuePath(a.id, next) : `/einsatz/${a.id}/${SUMMARY_STEP_ID}`,
          resumeStep: steps.find((x) => x.id === (next?.stepId ?? SUMMARY_STEP_ID))?.title,
          id: a.id,
          title: assessmentTitle(a, customers),
          date: formatDateDe(a.date),
          open: issues.filter((i) => i.level === 'blocking').length,
          createdBy: a.createdBy,
          practice: !!a.practice,
        }
      }),
    )
  }, [org?.id])

  const latest = drafts?.[0]
  const others = drafts?.slice(1) ?? []

  const start = async (template?: JobTemplate) => {
    if (!org || starting) return
    setStarting(true)
    const a = await startAssessment(db, org.id, { template })
    navigate(`/einsatz/${a.id}/job`)
  }

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Entwurf „${title}“ wirklich löschen?`)) return
    const a = await db.assessments.get(id)
    await (a?.practice ? deletePractice(db, id) : deleteDraft(db, id))
  }

  return (
    <div className="space-y-4">
      <PageTitle>Gefährdungsermittlung</PageTitle>

      <SetupCards place="welcome" />

      {latest && (
        <ResumeCard
          draft={latest}
          onRemove={
            rights.canDelete(latest, 'draft')
              ? () => void remove(latest.id, latest.title)
              : undefined
          }
        />
      )}

      <Button
        variant={latest ? 'secondary' : 'primary'}
        className="min-h-16 w-full text-lg"
        onClick={() => void start()}
        disabled={!org || starting}
      >
        + Neue Gefährdungsermittlung
      </Button>

      {org?.jobTemplates?.length ? (
        <TemplateStart
          templates={org.jobTemplates}
          disabled={starting}
          onStart={(t) => void start(t)}
        />
      ) : null}

      <DueNotice />
      <BackupReminder />
      <SetupCards place="checklist" />

      {drafts?.length === 0 && (
        <Card title="Entwürfe">
          <p className="text-stone-600 dark:text-stone-400">Noch keine angefangenen Einsätze.</p>
        </Card>
      )}
      {others.length > 0 && (
        <Card title="Weitere Entwürfe">
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {others.map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <Link to={d.resume} className="min-h-16 min-w-0 flex-1 py-2">
                  <span className="block truncate font-semibold">
                    {d.practice && <PracticeBadge />}
                    {d.title}
                  </span>
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
        </Card>
      )}

      <PracticeList />

      <InstallHint />
    </div>
  )
}

interface DraftInfo {
  id: string
  title: string
  date: string
  open: number
  practice: boolean
  resume: string
  resumeStep?: string
}

/** The most recent draft, prominently: continue where something is still missing. */
function ResumeCard({ draft, onRemove }: { draft: DraftInfo; onRemove?: () => void }) {
  return (
    <section
      aria-label="Weitermachen"
      className="rounded-2xl border-2 border-brand-700 bg-white dark:border-brand-300 dark:bg-stone-900"
    >
      <div className="flex items-start gap-2">
        <Link to={draft.resume} className="block min-w-0 flex-1 p-4">
          <span className="block text-sm font-semibold text-brand-700 dark:text-brand-300">
            Weitermachen
          </span>
          <span className="block truncate text-lg font-bold">
            {draft.practice && <PracticeBadge />}
            {draft.title}
          </span>
          <span className="block text-stone-600 dark:text-stone-400">
            {draft.date} ·{' '}
            {draft.open === 0 ? 'bereit zum Abschluss' : `${draft.open} offene Punkte`}
          </span>
          <span className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-brand-700 px-4 font-semibold text-white">
            {draft.open === 0 ? 'Prüfen & abschließen ›' : `Weiter bei „${draft.resumeStep}“ ›`}
          </span>
        </Link>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Entwurf ${draft.title} löschen`}
            className="m-2 flex size-12 shrink-0 items-center justify-center rounded-full text-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            🗑
          </button>
        )}
      </div>
    </section>
  )
}

/** "Mit Vorlage starten": one tap starts a job with type, work, team and equipment. */
function TemplateStart({
  templates,
  disabled,
  onStart,
}: {
  templates: JobTemplate[]
  disabled: boolean
  onStart: (t: JobTemplate) => void
}) {
  const sorted = [...templates].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return (
    <section aria-label="Mit Vorlage starten" className="space-y-2">
      <h2 className="font-semibold text-stone-700 dark:text-stone-300">Mit Vorlage starten</h2>
      <div className="flex flex-wrap gap-2">
        {sorted.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onStart(t)}
            title={templateSummary(t)}
            className="min-h-12 rounded-xl border-2 border-brand-700 bg-white px-4 font-semibold text-brand-700 dark:border-brand-300 dark:bg-stone-900 dark:text-brand-300"
          >
            ＋ {t.name}
          </button>
        ))}
      </div>
    </section>
  )
}
