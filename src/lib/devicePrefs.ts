import { useSyncExternalStore } from 'react'

/**
 * Per-device display and feedback preferences (like the colour theme deliberately in
 * localStorage, not in the synced database).
 */
export type DevicePref = 'sun' | 'vibrate'

const KEYS: Record<DevicePref, string> = { sun: 'baumcheck.sun', vibrate: 'baumcheck.vibrate' }
const DEFAULTS: Record<DevicePref, boolean> = { sun: false, vibrate: true }
const listeners = new Set<() => void>()

export function getPref(pref: DevicePref): boolean {
  try {
    const v = localStorage.getItem(KEYS[pref])
    if (v === '1') return true
    if (v === '0') return false
  } catch {
    // Storage blocked – default.
  }
  return DEFAULTS[pref]
}

export function setPref(pref: DevicePref, on: boolean): void {
  try {
    localStorage.setItem(KEYS[pref], on ? '1' : '0')
  } catch {
    // Ignore: the preference just won't persist.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePref(pref: DevicePref): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getPref(pref),
    () => DEFAULTS[pref],
  )
}

/** Short vibration as feedback (Android; iPhones ignore it). */
export function haptic(kind: 'tap' | 'warn'): void {
  if (!getPref('vibrate')) return
  try {
    navigator.vibrate?.(kind === 'warn' ? [40, 60, 40] : 12)
  } catch {
    // Not supported.
  }
}
