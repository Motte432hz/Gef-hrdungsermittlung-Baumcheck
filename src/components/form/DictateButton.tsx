import { useEffect, useRef, useState } from 'react'
import { listen, speechErrorMessage, speechSupported } from '../../lib/speech'

/** Microphone button for text fields; hidden where the browser cannot recognise speech. */
export function DictateButton({
  onText,
  label,
}: {
  onText: (text: string) => void
  label: string
}) {
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string>()
  const stop = useRef<(() => void) | undefined>(undefined)
  const textRef = useRef(onText)
  useEffect(() => {
    textRef.current = onText
  })
  useEffect(() => () => stop.current?.(), [])

  if (!speechSupported()) return null

  const toggle = () => {
    if (active) return stop.current?.()
    setError(undefined)
    setActive(true)
    stop.current = listen(
      (t) => textRef.current(t),
      (code) => {
        setActive(false)
        setError(speechErrorMessage(code))
      },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={active}
        title={`Spracheingabe: ${label}`}
        className={`inline-flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 font-semibold ${
          active
            ? 'animate-pulse border-red-700 bg-red-700 text-white'
            : 'border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900'
        }`}
      >
        <span aria-hidden="true">🎤</span>
        {active ? 'Hört zu … tippen zum Beenden' : 'Sprechen'}
      </button>
      {error && (
        <span className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</span>
      )}
    </div>
  )
}
