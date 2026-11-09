import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { canComplete, type Issue, type IssueLevel } from '../form/validation'
import { useWizard } from './WizardContext'
import { wizardSteps } from './steps'
import { itemAnchor } from './anchors'
import { Card } from '../components/Card'
import { Notice } from './inputs/Notice'
import { db } from '../db/db'
import { getSignatures } from '../db/repo'
import { assessmentContentHash } from '../report/contentHash'
import { allSigned, requiredSignatures } from '../report/signatures'
import {
  buildSummary,
  signaturePlace,
  type SummaryRow,
  type SummarySection,
} from '../report/summary'
import { formatDateDe } from './draftInfo'
import { SignCard } from './summary/SignCard'
import { CompleteCard } from './summary/CompleteCard'

const levelOrder: IssueLevel[] = ['danger', 'blocking', 'warning', 'info']
const levelTitle: Record<IssueLevel, string> = {
  danger: 'Achtung',
  blocking: 'Noch offen',
  warning: 'Warnungen',
  info: 'Hinweise',
}

const toneClass: Record<SummaryRow['tone'], string> = {
  ok: '',
  neutral: '',
  empty: 'text-stone-500',
  bad: 'font-semibold text-amber-800 dark:text-amber-300',
  danger: 'font-bold text-red-700 dark:text-red-400',
}

function Rows({ rows }: { rows: SummaryRow[] }) {
  return (
    <dl className="divide-y divide-stone-200 dark:divide-stone-800">
      {rows.map((r) => (
        <div key={r.itemId} className="py-2">
          <dt className="text-sm text-stone-600 dark:text-stone-400">{r.label}</dt>
          <dd className={`whitespace-pre-line ${toneClass[r.tone]}`}>{r.value}</dd>
          {r.note && (
            <dd className="mt-1 rounded-lg bg-amber-50 px-2 py-1 dark:bg-amber-950">
              <span className="font-semibold">{r.noteLabel ?? 'Maßnahme'}:</span> {r.note}
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}

export function SummaryStep() {
  const { definition, assessment, trees, issues } = useWizard()
  const steps = wizardSteps(definition)
  const stepTitle = (id: string) => steps.find((s) => s.id === id)?.title ?? id
  const ready = canComplete(issues)

  const data = useLiveQuery(async () => {
    const [signatures, customer, photos] = await Promise.all([
      getSignatures(db, assessment.id),
      assessment.customerId ? db.customers.get(assessment.customerId) : undefined,
      db.attachments.where('assessmentId').equals(assessment.id).toArray(),
    ])
    const photoIds: Record<string, string[]> = {}
    for (const p of photos)
      if (p.treeId && p.kind === 'tree_photo') (photoIds[p.treeId] ??= []).push(p.id)
    const hash = await assessmentContentHash(assessment, trees, photoIds)
    return { signatures, customer, photoIds, hash }
  }, [assessment, trees])

  const stepLink = (stepId: string, treeId?: string, itemId?: string) =>
    `/einsatz/${assessment.id}/${stepId}${treeId ? `?baum=${treeId}` : ''}${itemId ? `#${itemAnchor(itemId, treeId)}` : ''}`

  if (!data) return <p>Lädt …</p>

  const sections = buildSummary({
    definition,
    assessment,
    trees,
    customer: data.customer,
    photoCount: Object.fromEntries(Object.entries(data.photoIds).map(([k, v]) => [k, v.length])),
  })
  const findings = sections.flatMap((s) =>
    s.rows
      .filter((r) => r.tone === 'bad' || r.tone === 'danger')
      .map((r) => ({ section: s, row: r })),
  )
  const req = requiredSignatures(
    assessment.team,
    assessment.supervisorMemberId,
    data.signatures,
    data.hash,
  )
  const supervisor = assessment.team.find((m) => m.id === assessment.supervisorMemberId)
  const place = signaturePlace({ assessment, customer: data.customer })
  const signedCount = req.filter((r) => r.signature && !r.outdated).length

  return (
    <div className="space-y-6">
      {/* 1. Open points */}
      {!ready && (
        <p className="text-stone-700 dark:text-stone-300">
          Tippe auf einen Punkt, um direkt dorthin zu springen.
        </p>
      )}
      {levelOrder.map((level) => {
        const list = issues.filter((i) => i.level === level)
        if (list.length === 0) return null
        return (
          <Card key={level} title={`${levelTitle[level]} (${list.length})`}>
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {list.map((i: Issue) => (
                <li key={i.key}>
                  <Link
                    to={stepLink(i.stepId, i.treeId, i.itemId)}
                    className="flex min-h-14 items-center justify-between gap-3 py-2"
                  >
                    <span>
                      <span className="block text-sm text-stone-600 dark:text-stone-400">
                        {stepTitle(i.stepId)}
                        {i.treeIndex !== undefined && ` · Baum ${i.treeIndex + 1}`}
                      </span>
                      <span className="block font-semibold">{i.message}</span>
                    </span>
                    <span aria-hidden="true" className="text-2xl text-stone-400">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}

      {/* 2. Hazards and measures */}
      <section aria-label="Gefahren und Maßnahmen" className="space-y-2">
        <h2 className="text-xl font-bold">Gefahren und Maßnahmen</h2>
        {findings.length === 0 ? (
          <p className="text-stone-600 dark:text-stone-400">
            Keine Gefahren oder Abweichungen angegeben.
          </p>
        ) : (
          <ul className="space-y-2">
            {findings.map(({ section, row }) => (
              <li
                key={`${section.treeId ?? ''}${row.itemId}`}
                className={`rounded-xl border-l-4 bg-white p-3 dark:bg-stone-900 ${row.tone === 'danger' ? 'border-red-700' : 'border-amber-600'}`}
              >
                <p className="text-sm text-stone-600 dark:text-stone-400">{section.title}</p>
                <p className="font-semibold">
                  {row.label}: {row.value}
                </p>
                <p>
                  <span className="font-semibold">{row.noteLabel ?? 'Maßnahme'}:</span>{' '}
                  {row.note || '–'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. All answers */}
      <section aria-label="Alle Angaben" className="space-y-2">
        <h2 className="text-xl font-bold">Alle Angaben</h2>
        {sections.map((s: SummarySection) => (
          <details
            key={`${s.stepId}${s.treeId ?? ''}`}
            className="rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
          >
            <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-2 px-4 font-semibold">
              {s.title}
              <span className="text-sm font-normal text-stone-500">{s.rows.length} Angaben</span>
            </summary>
            <div className="px-4 pb-3">
              <Rows rows={s.rows} />
              <Link
                to={stepLink(s.stepId, s.treeId)}
                className="mt-2 inline-flex min-h-12 items-center font-semibold text-brand-700 underline dark:text-brand-300"
              >
                Bearbeiten
              </Link>
            </div>
          </details>
        ))}
      </section>

      {/* 4. Signatures */}
      <section aria-label="Unterschriften" className="space-y-3">
        <h2 className="text-xl font-bold">
          Unterschriften ({signedCount} von {req.length})
        </h2>
        <p className="text-stone-700 dark:text-stone-300">
          Ort: {place || '–'} · Datum: {formatDateDe(assessment.date)}
        </p>
        {!ready ? (
          <Notice level="blocking">
            Unterschreiben ist erst möglich, wenn alle offenen Punkte erledigt sind.
          </Notice>
        ) : req.length === 0 ? (
          <Notice level="blocking">Im Team ist noch niemand eingetragen.</Notice>
        ) : (
          <ul className="space-y-3">
            {req.map((r) => (
              <SignCard
                key={`${r.member.id}-${r.statement}`}
                req={r}
                statementText={
                  r.statement === 'supervisor'
                    ? definition.statements.supervisor
                    : definition.statements.member
                }
                assessmentId={assessment.id}
                contentHash={data.hash}
                supervisorName={supervisor?.name}
              />
            ))}
          </ul>
        )}
      </section>

      {/* 5. Completion */}
      <CompleteCard ready={ready && allSigned(req)} assessmentId={assessment.id} />
    </div>
  )
}
