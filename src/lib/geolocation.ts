import type { GeoPosition } from '../domain/types'

export type GeoErrorKind = 'unsupported' | 'denied' | 'unavailable' | 'timeout'

export class GeoError extends Error {
  constructor(public kind: GeoErrorKind) {
    super(kind)
    this.name = 'GeoError'
  }
}

export const GEO_ERROR_TEXT: Record<GeoErrorKind, string> = {
  unsupported: 'Dieses Gerät oder dieser Browser kann den Standort nicht bestimmen.',
  denied:
    'Der Zugriff auf den Standort wurde nicht erlaubt. Bitte in den Einstellungen des Geräts bzw. Browsers für BaumCheck freigeben.',
  unavailable: 'Der Standort ist gerade nicht verfügbar. Unter freiem Himmel erneut versuchen.',
  timeout: 'Die Standortbestimmung hat zu lange gedauert. Bitte erneut versuchen.',
}

export interface CaptureOptions {
  /** Stop as soon as this accuracy (m) is reached. */
  targetAccuracy?: number
  /** Give up waiting for better fixes after this time; returns the best fix so far. */
  maxWaitMs?: number
  onUpdate?: (best: GeoPosition) => void
  signal?: AbortSignal
}

const toPosition = (p: GeolocationPosition): GeoPosition => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
  accuracy: Math.round(p.coords.accuracy),
  capturedAt: new Date(p.timestamp || Date.now()).toISOString(),
})

/**
 * Watches the position and keeps the most accurate fix. GPS needs a few seconds to settle,
 * the first fix is often only Wi-Fi/cell based.
 */
export function capturePosition({
  targetAccuracy = 10,
  maxWaitMs = 20_000,
  onUpdate,
  signal,
}: CaptureOptions = {}): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new GeoError('unsupported'))
    let best: GeoPosition | undefined
    let done = false
    const finish = (fn: () => void) => {
      if (done) return
      done = true
      navigator.geolocation.clearWatch(watchId)
      clearTimeout(timer)
      fn()
    }
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const pos = toPosition(p)
        if (!best || (pos.accuracy ?? Infinity) <= (best.accuracy ?? Infinity)) {
          best = pos
          onUpdate?.(best)
        }
        if ((best.accuracy ?? Infinity) <= targetAccuracy) finish(() => resolve(best!))
      },
      (err) => {
        // Keep a usable fix even if a later update fails.
        if (best) return finish(() => resolve(best!))
        const kind: GeoErrorKind =
          err.code === err.PERMISSION_DENIED
            ? 'denied'
            : err.code === err.TIMEOUT
              ? 'timeout'
              : 'unavailable'
        finish(() => reject(new GeoError(kind)))
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs },
    )
    const timer = setTimeout(
      () => finish(() => (best ? resolve(best) : reject(new GeoError('timeout')))),
      maxWaitMs,
    )
    signal?.addEventListener('abort', () =>
      finish(() => (best ? resolve(best) : reject(new DOMException('aborted', 'AbortError')))),
    )
  })
}
