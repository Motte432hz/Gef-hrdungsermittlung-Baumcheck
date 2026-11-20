import { useOnlineStatus } from '../lib/online'

/** compact: only a dot while online (the word appears when the connection is gone). */
export function OnlineBadge({ compact = false }: { compact?: boolean }) {
  const online = useOnlineStatus()
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={online ? 'Verbindung: Online' : 'Verbindung: Offline'}
      className={`inline-flex items-center gap-2 rounded-full py-1 text-sm font-semibold ${compact && online ? 'px-2' : 'px-3'} ${
        online
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-100'
          : 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-2.5 rounded-full ${online ? 'bg-brand-500' : 'bg-amber-600'}`}
      />
      {online ? !compact && 'Online' : 'Offline'}
    </span>
  )
}
