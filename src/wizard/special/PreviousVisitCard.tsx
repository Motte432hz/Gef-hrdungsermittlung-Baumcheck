import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useWizard } from '../WizardContext'
import { applyPreviousSite, findPreviousVisit, missingSiteAnswers } from '../previousVisit'

const formatDate = (iso: string) => iso.split('-').reverse().join('.')

/** Hint on the last visit at the same customer/object: known hazards and one-tap location data. */
export function PreviousVisitCard() {
  const { assessment } = useWizard()
  const prev = useLiveQuery(
    () => findPreviousVisit(db, assessment),
    [assessment.id, assessment.customerId, assessment.siteId],
  )
  if (!prev) return null
  const p = prev.assessment
  const canApply =
    Object.keys(missingSiteAnswers(assessment, p)).length > 0 ||
    (!assessment.position && !!p.position)

  return (
    <section
      aria-label="Letzter Einsatz an diesem Objekt"
      className="space-y-2 rounded-xl border-l-4 border-sky-700 bg-sky-50 p-3 text-sky-950 dark:bg-sky-950 dark:text-sky-50"
    >
      <p className="font-semibold">
        Letzter Einsatz hier: {formatDate(p.date)}
        {p.protocolNumber ? ` · Nr. ${p.protocolNumber}` : ''}
      </p>
      {prev.findings.length > 0 ? (
        <div>
          <p className="text-sm font-semibold">Damals festgestellt – bitte erneut prüfen:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {prev.findings.map((f) => (
              <li key={`${f.treeId ?? ''}${f.itemId}`}>
                {f.treeIndex !== undefined ? `Baum ${f.treeIndex + 1}: ` : ''}
                {f.label}
                {f.detail ? ` (${f.detail})` : ''}
                {f.note ? ` – Maßnahme: ${f.note}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm">Damals keine Gefahren oder Abweichungen festgestellt.</p>
      )}
      {canApply && (
        <button
          type="button"
          onClick={() => void applyPreviousSite(db, assessment, p)}
          className="min-h-12 w-full rounded-xl border-2 border-sky-700 bg-white px-3 font-semibold text-sky-900 dark:border-sky-300 dark:bg-sky-900 dark:text-sky-50"
        >
          Standort und Rettungsweg übernehmen
        </button>
      )}
    </section>
  )
}
