import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './Button'

const OFFLINE_READY_HIDE_MS = 6000
const UPDATE_CHECK_MS = 30 * 60 * 1000

/**
 * Banner for "new version available" (stays until the user decides) and
 * "works offline now" (informational, hides itself). Rendered as a normal bar in the page
 * flow (not floating), so it never covers buttons or form fields.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Installed apps on iOS are often only resumed, not reloaded – check for updates
    // whenever the app comes back to the foreground and every 30 minutes.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => {})
      }
      setInterval(check, UPDATE_CHECK_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

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
      className="pt-safe border-b border-stone-200 bg-sky-50 px-4 py-3 dark:border-stone-700 dark:bg-sky-950"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-semibold">
          {needRefresh
            ? 'Eine neue Version von BaumCheck ist verfügbar.'
            : 'BaumCheck ist jetzt auch ohne Internet nutzbar.'}
        </p>
        <div className="flex gap-2">
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
    </div>
  )
}
