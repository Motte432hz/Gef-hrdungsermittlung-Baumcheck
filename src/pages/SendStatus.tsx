import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Assessment } from '../domain/types'
import { useOrganization } from '../app/useOrganization'
import { useCloudRights } from '../cloud/useCloudRights'
import { outboxEntry, queueSend } from '../cloud/outbox'
import { syncNow, useSyncStatus } from '../cloud/syncManager'
import { Button } from '../components/Button'

/** Automatic sending of the PDF to the office (with the cloud). */
export function SendStatus({ assessment }: { assessment: Assessment }) {
  const org = useOrganization()
  const rights = useCloudRights()
  const sync = useSyncStatus()
  const entry = useLiveQuery(() => outboxEntry(db, assessment.id), [assessment.id])
  const to = org?.reportEmails ?? []
  if (!rights.cloud || assessment.status === 'sent') return null

  if (to.length === 0)
    return (
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Automatischer Versand: unter Firma → Versand eine E-Mail-Adresse eintragen.
      </p>
    )

  if (entry)
    return (
      <div className="space-y-2 rounded-xl border-l-4 border-sky-700 bg-sky-50 p-3 text-sky-950 dark:bg-sky-950 dark:text-sky-50">
        <p role="status" className="font-semibold" data-testid="send-status">
          {entry.lastError
            ? `Versand an ${to.join(', ')} hat nicht geklappt: ${entry.lastError}`
            : sync.state === 'offline'
              ? `Wird an ${to.join(', ')} gesendet, sobald wieder Netz da ist.`
              : `Wird an ${to.join(', ')} gesendet …`}
        </p>
        {entry.lastError && (
          <Button variant="secondary" onClick={() => void syncNow(db)}>
            Erneut versuchen
          </Button>
        )}
      </div>
    )

  return (
    <Button
      variant="secondary"
      onClick={() =>
        void queueSend(db, assessment.id).then((ok) => {
          if (ok) void syncNow(db)
        })
      }
    >
      An das Büro senden ({to.join(', ')})
    </Button>
  )
}
