import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './Button'

const OFFLINE_READY_HIDE_MS = 6000

/**
 * Banner for "new version available" (stays until the user decides) and
 * "works offline now" (informational, hides itself). Shown at the top so it never
 * covers save buttons or the bottom navigation.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!offlineReady || needRefresh) return
    const t = setTimeout(() => setOfflineReady(false), OFFLINE_READY_HIDE_MS)
    return () => clearTimeout(t)
  }, [offlineReady, needRefresh, setOfflineReady])

  if (!offlineReady && !needRefresh) return null

  return (
    <div
      role={needRefresh ? 'alert' : 'status'}
      aria-label="App-Hinweis"
      className="fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top))] z-20 mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-4 shadow-lg md:left-63 dark:border-stone-700 dark:bg-stone-900"
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
