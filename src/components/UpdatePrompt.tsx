import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './Button'

/** Shows a banner when a new app version is ready or the app became offline-capable. */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-20 z-20 mx-auto max-w-md md:left-63 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg md:bottom-6 dark:border-stone-700 dark:bg-stone-900"
    >
      <p className="font-semibold">
        {needRefresh
          ? 'Eine neue Version von BaumCheck ist verfügbar.'
          : 'BaumCheck ist jetzt auch ohne Internet nutzbar.'}
      </p>
      <div className="mt-3 flex gap-2">
        {needRefresh && (
          <Button onClick={() => void updateServiceWorker(true)}>Jetzt aktualisieren</Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            setOfflineReady(false)
            setNeedRefresh(false)
          }}
        >
          {needRefresh ? 'Später' : 'OK'}
        </Button>
      </div>
    </div>
  )
}
