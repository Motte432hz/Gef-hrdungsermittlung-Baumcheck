/** True when running as installed app (home screen / standalone window). */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true
}

export type Platform = 'ios' | 'android' | 'other'

export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  // iPadOS 13+ reports itself as Mac; touch support gives it away.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'other'
}
