import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Saves `value` automatically shortly after it changes (no save button). Pending changes are
 * written when the page is left or hidden. `enabled` = the value is valid enough to be saved.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  { enabled, delay = 500 }: { enabled: boolean; delay?: number },
): SaveState {
  const [state, setState] = useState<SaveState>('idle')
  const serialized = JSON.stringify(value)
  const latest = useRef({ value, serialized, save, enabled })
  const lastSaved = useRef(serialized)
  // Same as lastSaved, as state: lets the status show "saving" as soon as something changed.
  const [savedSnapshot, setSavedSnapshot] = useState(serialized)
  const timer = useRef<number | undefined>(undefined)

  useLayoutEffect(() => {
    latest.current = { value, serialized, save, enabled }
  })

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    const { value: v, serialized: s, save: write, enabled: ok } = latest.current
    if (!ok || s === lastSaved.current) return
    setState('saving')
    try {
      await write(v)
      lastSaved.current = s
      setSavedSnapshot(s)
      setState('saved')
    } catch (err) {
      console.error(err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), delay)
  }, [serialized, enabled, delay, flush])

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      // Leaving the page: write what is still pending.
      void flush()
    }
  }, [flush])

  const dirty = enabled && serialized !== savedSnapshot && state !== 'error'
  return dirty ? 'saving' : state
}
