import { useEffect, useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

// Per-device display preference; deliberately in localStorage, not in the synced database.
export const THEME_STORAGE_KEY = 'baumcheck.theme'
const listeners = new Set<() => void>()

export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // Storage blocked (private mode etc.) – fall back to system.
  }
  return 'system'
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    // Ignore: preference just won't persist.
  }
  listeners.forEach((l) => l())
}

export function resolveDark(pref: ThemePreference, systemPrefersDark: boolean): boolean {
  return pref === 'dark' || (pref === 'system' && systemPrefersDark)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference, () => 'system')
}

/** Keeps the `dark` class on <html> in sync with preference and OS setting. */
export function useThemeSync(): void {
  const pref = useThemePreference()
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () =>
      document.documentElement.classList.toggle('dark', resolveDark(pref, mq.matches))
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])
}
