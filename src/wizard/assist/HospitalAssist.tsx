import { useState } from 'react'
import { useWizard } from '../WizardContext'
import { useOnlineStatus } from '../../lib/online'
import { findHospitals, hospitalText, type Hospital } from '../../online/hospital'
import { Button } from '../../components/Button'

/** Suggests the nearest hospitals (emergency departments first) for the rescue information. */
export function HospitalAssist({ itemId, treeId }: { itemId: string; treeId?: string }) {
  const { assessment, setAnswer } = useWizard()
  const online = useOnlineStatus()
  const [list, setList] = useState<Hospital[]>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const pos = assessment.position

  if (!pos)
    return (
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Tipp: Mit GPS-Position (oben) und Internet schlägt die App das nächste Krankenhaus vor.
      </p>
    )

  const search = async () => {
    setBusy(true)
    setError(undefined)
    try {
      setList((await findHospitals(pos)).slice(0, 3))
    } catch (e) {
      console.error(e)
      setError('Die Suche ist gerade nicht erreichbar. Bitte von Hand eintragen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {!list && (
        <Button variant="secondary" onClick={() => void search()} disabled={busy || !online}>
          {busy ? 'Sucht …' : online ? 'Nächste Notaufnahme suchen' : 'Suche nur mit Internet'}
        </Button>
      )}
      {error && <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>}
      {list && list.length === 0 && (
        <p className="text-sm">Kein Krankenhaus im Umkreis von 40 km gefunden.</p>
      )}
      {list && list.length > 0 && (
        <ul aria-label="Krankenhäuser in der Nähe" className="space-y-2">
          {list.map((h) => (
            <li
              key={h.name}
              className="space-y-2 rounded-xl border-2 border-stone-200 p-3 dark:border-stone-700"
            >
              <p className="font-semibold">
                {h.name}{' '}
                <span className="font-normal text-stone-600 dark:text-stone-400">
                  · {h.distanceKm.toFixed(1).replace('.', ',')} km Luftlinie
                </span>
              </p>
              <p className="text-sm">
                {h.emergency ? '✚ Notaufnahme' : 'Notaufnahme nicht angegeben'}
                {h.address && ` · ${h.address}`}
                {h.phone && ` · Tel. ${h.phone}`}
              </p>
              <Button
                variant="secondary"
                onClick={() => void setAnswer(itemId, { value: hospitalText(h) }, treeId)}
              >
                Übernehmen
              </Button>
            </li>
          ))}
        </ul>
      )}
      {list && (
        <p className="text-xs text-stone-600 dark:text-stone-400">
          Daten: © OpenStreetMap-Mitwirkende. Ohne Gewähr – im Notfall immer 112.
        </p>
      )}
    </div>
  )
}
