import type { GeoPosition } from '../domain/types'

/** Best-effort position for a signature: cached fixes are fine, never waits long. */
export function quickPosition(timeoutMs = 4000): Promise<GeoPosition | undefined> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(undefined)
    const timer = setTimeout(() => resolve(undefined), timeoutMs + 500)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(timer)
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
          capturedAt: new Date(p.timestamp || Date.now()).toISOString(),
        })
      },
      () => {
        clearTimeout(timer)
        resolve(undefined)
      },
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: timeoutMs },
    )
  })
}
