import { useRef, useState } from 'react'
import type { SpecialItem } from '../../form/schema'
import type { GeoPosition } from '../../domain/types'
import { db } from '../../db/db'
import { setTreePosition } from '../../db/repo'
import { capturePosition, GeoError } from '../../lib/geolocation'
import { formatDecimal } from '../../domain/geo'
import { mapAppLink } from '../../lib/mapLink'
import { useWizard } from '../WizardContext'
import { ItemCard } from '../inputs/ItemCard'
import { ItemLabel } from '../inputs/InfoButton'
import { Button } from '../../components/Button'

/** GPS position of one tree, taken at the trunk. */
export function TreePositionField({ item, treeId }: { item: SpecialItem; treeId: string }) {
  const { trees } = useWizard()
  const pos = trees.find((t) => t.id === treeId)?.position
  const [live, setLive] = useState<GeoPosition>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const abort = useRef<AbortController | null>(null)

  const take = async () => {
    setBusy(true)
    setError(undefined)
    abort.current = new AbortController()
    try {
      const p = await capturePosition({
        targetAccuracy: 8,
        maxWaitMs: 15_000,
        onUpdate: setLive,
        signal: abort.current.signal,
      })
      await setTreePosition(db, treeId, p)
    } catch (e) {
      setError(
        e instanceof GeoError && e.kind === 'denied'
          ? 'Standort nicht erlaubt. Bitte in den Einstellungen des Geräts freigeben.'
          : 'Kein GPS-Signal. Bitte im Freien erneut versuchen.',
      )
    } finally {
      setBusy(false)
      setLive(undefined)
    }
  }

  return (
    <ItemCard>
      <ItemLabel label={item.label} info={item.info} />
      {pos && (
        <p>
          <span data-testid="tree-position">{formatDecimal(pos)}</span>
          {pos.accuracy !== undefined && (
            <span className="text-stone-600 dark:text-stone-400"> · ± {pos.accuracy} m</span>
          )}{' '}
          <a
            href={mapAppLink(pos)}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 underline dark:text-brand-300"
          >
            Karte
          </a>
        </p>
      )}
      {busy && (
        <p role="status">
          Suche GPS-Signal …{live?.accuracy !== undefined && ` (± ${live.accuracy} m)`}
        </p>
      )}
      {error && <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {busy ? (
          <Button variant="secondary" onClick={() => abort.current?.abort()}>
            Abbrechen
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => void take()}>
            {pos ? 'Neu übernehmen' : '📍 Standort am Stamm übernehmen'}
          </Button>
        )}
        {pos && !busy && (
          <Button variant="secondary" onClick={() => void setTreePosition(db, treeId, undefined)}>
            Entfernen
          </Button>
        )}
      </div>
    </ItemCard>
  )
}
