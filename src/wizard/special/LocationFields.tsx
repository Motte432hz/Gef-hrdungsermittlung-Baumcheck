import { lazy, Suspense, useRef, useState } from 'react'
import type { SpecialItem } from '../../form/schema'
import type { GeoPosition } from '../../domain/types'
import { useWizard } from '../WizardContext'
import { ItemCard } from '../inputs/ItemCard'
import { ItemLabel } from '../inputs/InfoButton'
import { Notice } from '../inputs/Notice'
import { TextItemField } from '../inputs/SimpleFields'
import { Button } from '../../components/Button'
import { useOnlineStatus } from '../../lib/online'
import { capturePosition, GEO_ERROR_TEXT, GeoError } from '../../lib/geolocation'
import { reverseGeocode } from '../../lib/reverseGeocode'
import { formatDecimal, formatDms } from '../../domain/geo'
import { mapAppLink } from '../../lib/mapLink'
import { GPS_ACCURACY_LIMIT_M } from '../../form/validation'

const MapView = lazy(() => import('./MapView'))

function accuracyTone(acc: number | undefined) {
  if (acc === undefined) return 'text-stone-600 dark:text-stone-400'
  if (acc <= 10) return 'text-brand-700 dark:text-brand-300'
  if (acc <= GPS_ACCURACY_LIMIT_M) return 'text-amber-700 dark:text-amber-300'
  return 'text-red-700 dark:text-red-400'
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function GpsField({ item }: { item: SpecialItem }) {
  const { assessment, update } = useWizard()
  const online = useOnlineStatus()
  const [capturing, setCapturing] = useState(false)
  const [live, setLive] = useState<GeoPosition>()
  const [error, setError] = useState<string>()
  const [copied, setCopied] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const pos = assessment.position

  const start = async () => {
    setError(undefined)
    setLive(undefined)
    setCapturing(true)
    abort.current = new AbortController()
    try {
      const best = await capturePosition({ onUpdate: setLive, signal: abort.current.signal })
      await update({ position: best })
    } catch (e) {
      if (e instanceof GeoError) setError(GEO_ERROR_TEXT[e.kind])
    } finally {
      setCapturing(false)
      setLive(undefined)
    }
  }

  return (
    <ItemCard>
      <ItemLabel label={item.label} info={item.info} />
      {capturing ? (
        <div className="space-y-3" role="status" aria-live="polite">
          <p className="text-lg font-semibold">
            {live
              ? `Genauigkeit ± ${live.accuracy} m – wird genauer …`
              : 'Standort wird bestimmt …'}
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Unter freiem Himmel stehen bleiben. Bei ± 10 m oder besser wird automatisch übernommen.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!live} onClick={() => abort.current?.abort()}>
              Jetzt übernehmen
            </Button>
          </div>
        </div>
      ) : pos ? (
        <div className="space-y-3">
          <div>
            <p className="font-mono text-xl font-bold" data-testid="gps-decimal">
              {formatDecimal(pos)}
            </p>
            <p className="text-sm text-stone-600 dark:text-stone-400">{formatDms(pos)}</p>
            <p className={`font-semibold ${accuracyTone(pos.accuracy)}`}>
              Genauigkeit ± {pos.accuracy ?? '?'} m ·{' '}
              {new Date(pos.capturedAt).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              Uhr
            </p>
          </div>
          {online ? (
            <Suspense fallback={<div className="h-52 rounded-xl bg-stone-100 dark:bg-stone-800" />}>
              <MapView position={pos} />
            </Suspense>
          ) : (
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Offline: keine Karte. Die Koordinaten reichen für den Notruf.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void start()}>
              Neu bestimmen
            </Button>
            <Button
              variant="secondary"
              onClick={() => void copy(formatDecimal(pos)).then((ok) => setCopied(ok))}
            >
              {copied ? '✓ Kopiert' : 'Koordinaten kopieren'}
            </Button>
            <a
              href={mapAppLink(pos)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center rounded-xl border-2 border-stone-300 px-5 font-semibold dark:border-stone-600"
            >
              In Karten-App öffnen
            </a>
          </div>
        </div>
      ) : (
        <Button className="min-h-14 w-full" onClick={() => void start()}>
          📍 Standort bestimmen
        </Button>
      )}
      {error && <Notice level="warning">{error}</Notice>}
    </ItemCard>
  )
}

export function AddressField({ item }: { item: SpecialItem }) {
  const { assessment, setAnswer } = useWizard()
  const online = useOnlineStatus()
  const [suggestion, setSuggestion] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  // After taking over a suggestion the text field is remounted and starts from the new value
  // directly (the live query may not have delivered the saved answer yet).
  const [takenOver, setTakenOver] = useState<{ version: number; value: string }>()
  const pos = assessment.position

  const suggest = async () => {
    if (!pos) return
    setLoading(true)
    setError(undefined)
    try {
      const address = await reverseGeocode(pos)
      if (address) setSuggestion(address)
      else setError('Für diese Position wurde keine Adresse gefunden.')
    } catch {
      setError('Adresse konnte nicht abgefragt werden. Bitte von Hand eintragen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <TextItemField
        key={takenOver?.version ?? 0}
        item={{
          ...item,
          type: 'text',
          multiline: true,
          placeholder: 'Straße, PLZ Ort oder Beschreibung',
        }}
        answer={takenOver ? { value: takenOver.value } : assessment.answers[item.id]}
        onChange={(a) => void setAnswer(item.id, a)}
      />
      {pos && online && !suggestion && (
        <Button variant="secondary" onClick={() => void suggest()} disabled={loading}>
          {loading ? 'Suche Adresse …' : 'Adresse aus GPS vorschlagen'}
        </Button>
      )}
      {pos && !online && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Ohne Netz kann keine Adresse vorgeschlagen werden. Bitte von Hand eintragen.
        </p>
      )}
      {suggestion && (
        <div className="space-y-2 rounded-xl border-2 border-brand-700 p-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">Vorschlag (OpenStreetMap):</p>
          <p className="text-lg font-semibold">{suggestion}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void setAnswer(item.id, { value: suggestion })
                setTakenOver({ version: (takenOver?.version ?? 0) + 1, value: suggestion })
                setSuggestion(undefined)
              }}
            >
              Übernehmen
            </Button>
            <Button variant="secondary" onClick={() => setSuggestion(undefined)}>
              Verwerfen
            </Button>
          </div>
        </div>
      )}
      {error && <Notice level="info">{error}</Notice>}
    </div>
  )
}
