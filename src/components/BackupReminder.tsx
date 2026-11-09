import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../db/db'
import { META_LAST_BACKUP } from '../backup/backup'

export const BACKUP_REMINDER_DAYS = 7

/** Reminds to back up when completed protocols exist and the last backup is old (or missing). */
export function BackupReminder() {
  const state = useLiveQuery(async () => {
    const completed = await db.assessments.where('status').anyOf('completed', 'sent').count()
    const last = (await db.meta.get(META_LAST_BACKUP))?.value as string | undefined
    const days = last ? Math.floor((Date.now() - Date.parse(last)) / 86_400_000) : undefined
    return { completed, days }
  })
  if (!state || state.completed === 0) return null
  if (state.days !== undefined && state.days < BACKUP_REMINDER_DAYS) return null
  return (
    <div
      role="status"
      className="rounded-2xl border-l-4 border-amber-600 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950 dark:text-amber-50"
    >
      <p className="font-semibold">
        {state.days === undefined
          ? 'Es gibt noch kein Backup deiner Protokolle.'
          : `Letztes Backup vor ${state.days} Tagen.`}
      </p>
      <p className="text-sm">
        Ohne Backup gehen die Daten verloren, wenn das Gerät kaputt geht oder verloren wird.
      </p>
      <Link
        to="/einstellungen"
        className="mt-1 inline-flex min-h-12 items-center font-semibold underline"
      >
        Jetzt sichern
      </Link>
    </div>
  )
}
