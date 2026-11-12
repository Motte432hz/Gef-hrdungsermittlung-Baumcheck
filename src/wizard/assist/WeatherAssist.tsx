import { useEffect, useState } from 'react'
import { useWizard } from '../WizardContext'
import { useOnlineStatus } from '../../lib/online'
import { fetchSiteWeather, STRONG_GUSTS_KMH, type SiteWeather } from '../../online/weather'
import { Button } from '../../components/Button'

const kmh = (v?: number) => (v === undefined ? '–' : `${Math.round(v)} km/h`)
const time = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('de-DE', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

const levelStyle: Record<string, string> = {
  minor: 'border-amber-500 bg-amber-50 dark:bg-amber-950',
  moderate: 'border-orange-600 bg-orange-50 dark:bg-orange-950',
  severe: 'border-red-700 bg-red-50 dark:bg-red-950',
  extreme: 'border-purple-800 bg-purple-50 dark:bg-purple-950',
}

/** Official DWD warnings and the current wind at the work site (online). */
export function WeatherAssist() {
  const { assessment } = useWizard()
  const online = useOnlineStatus()
  const pos = assessment.position
  // Primitive values: the position object is new on every save of the assessment.
  const lat = pos?.lat
  const lng = pos?.lng
  const [weather, setWeather] = useState<SiteWeather>()
  const [error, setError] = useState<string>()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (lat === undefined || lng === undefined || !online) return
    const ctrl = new AbortController()
    fetchSiteWeather({ lat, lng }, fetch, ctrl.signal)
      .then((w) => {
        setWeather(w)
        setError(undefined)
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return
        console.error(e)
        setError('Wetterdaten gerade nicht erreichbar.')
      })
    return () => ctrl.abort()
  }, [lat, lng, online, tick])

  if (!pos)
    return (
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Tipp: Mit GPS-Position und Internet zeigt die App hier Wind und amtliche Wetterwarnungen.
      </p>
    )
  if (!online)
    return (
      <p className="text-sm text-stone-600 dark:text-stone-400">Wetterdaten nur mit Internet.</p>
    )
  if (error) return <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
  if (!weather) return <p className="text-sm">Lädt Wetter am Einsatzort …</p>

  const strong = (weather.gusts ?? 0) >= STRONG_GUSTS_KMH
  return (
    <section aria-label="Wetter am Einsatzort" className="space-y-2">
      <p className={strong ? 'font-semibold text-red-700 dark:text-red-400' : ''}>
        Wind {kmh(weather.wind)}, Böen {kmh(weather.gusts)}
        {strong && ' – starke Böen: Klettern und Abseilen kritisch prüfen'}
      </p>
      {weather.warnings.length === 0 ? (
        <p className="text-sm">Keine amtlichen Warnungen für den Einsatzort.</p>
      ) : (
        <ul className="space-y-2">
          {weather.warnings.map((w, i) => (
            <li key={i} className={`rounded-xl border-l-4 p-2 ${levelStyle[w.level]}`}>
              <p className="font-semibold">{w.headline}</p>
              {(w.onset || w.expires) && (
                <p className="text-sm">
                  {time(w.onset)} bis {time(w.expires)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setTick((t) => t + 1)}>
          Aktualisieren
        </Button>
        <span className="text-xs text-stone-600 dark:text-stone-400">
          Quelle: Deutscher Wetterdienst (über Bright Sky)
        </span>
      </div>
    </section>
  )
}
