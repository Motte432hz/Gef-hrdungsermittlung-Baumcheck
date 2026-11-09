import { useOnlineStatus } from '../lib/online'

export function OnlineBadge() {
  const online = useOnlineStatus()
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
        online
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-100'
          : 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-2.5 rounded-full ${online ? 'bg-brand-500' : 'bg-amber-600'}`}
      />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}
