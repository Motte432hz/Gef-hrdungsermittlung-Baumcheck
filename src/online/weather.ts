import type { LatLng } from '../domain/geo'

/**
 * Weather at the work site from the German weather service (DWD), via the open Bright Sky
 * API: official warnings and current wind. Online only.
 */
export const BRIGHTSKY_URL = 'https://api.brightsky.dev'

export type WarningLevel = 'minor' | 'moderate' | 'severe' | 'extreme'
export interface WeatherWarning {
  event: string
  headline: string
  description?: string
  level: WarningLevel
  onset?: string
  expires?: string
}
export interface SiteWeather {
  warnings: WeatherWarning[]
  /** km/h */
  wind?: number
  gusts?: number
  condition?: string
  observedAt?: string
}

const LEVELS: WarningLevel[] = ['minor', 'moderate', 'severe', 'extreme']

export async function fetchSiteWeather(
  at: LatLng,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<SiteWeather> {
  const q = `lat=${at.lat.toFixed(4)}&lon=${at.lng.toFixed(4)}`
  const [alertsRes, currentRes] = await Promise.all([
    fetchImpl(`${BRIGHTSKY_URL}/alerts?${q}`, { signal }),
    fetchImpl(`${BRIGHTSKY_URL}/current_weather?${q}`, { signal }),
  ])
  if (!alertsRes.ok) throw new Error(`Wetterdienst nicht erreichbar (${alertsRes.status}).`)
  const alerts = (await alertsRes.json()) as {
    alerts?: {
      event_de?: string
      headline_de?: string
      description_de?: string
      severity?: string
      onset?: string
      expires?: string
    }[]
  }
  const current = currentRes.ok
    ? ((await currentRes.json()) as {
        weather?: {
          wind_speed_10?: number | null
          wind_gust_speed_10?: number | null
          condition?: string | null
          timestamp?: string
        }
      })
    : {}
  const w = current.weather
  return {
    warnings: (alerts.alerts ?? [])
      .map((a) => ({
        event: a.event_de ?? 'Warnung',
        headline: a.headline_de ?? a.event_de ?? 'Amtliche Warnung',
        description: a.description_de,
        level: (LEVELS.includes(a.severity as WarningLevel) ? a.severity : 'minor') as WarningLevel,
        onset: a.onset,
        expires: a.expires,
      }))
      .sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level)),
    wind: w?.wind_speed_10 ?? undefined,
    gusts: w?.wind_gust_speed_10 ?? undefined,
    condition: w?.condition ?? undefined,
    observedAt: w?.timestamp,
  }
}

/** Gusts from about 50 km/h (Beaufort 7) make climbing and rigging dangerous. */
export const STRONG_GUSTS_KMH = 50
