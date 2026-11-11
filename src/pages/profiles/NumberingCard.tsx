import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { numberingInfo, NumberTooLowError, setNextNumber } from '../../db/numbering'
import { normalizeCode } from '../../domain/protocolNumber'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { TextField } from '../../components/form/Field'

/** Shows how protocol numbers are built and lets a series be continued (e.g. from paper forms). */
export function NumberingCard({ prefix, savedPrefix }: { prefix: string; savedPrefix: string }) {
  const p = normalizeCode(prefix)
  const info = useLiveQuery(() => numberingInfo(db, p || savedPrefix), [p, savedPrefix])
  const [start, setStart] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string }>()
  const changed = p && p !== normalizeCode(savedPrefix)

  if (!info) return null

  const apply = async () => {
    setMessage(undefined)
    try {
      await setNextNumber(db, info.prefix, info.year, Number(start))
      setStart('')
      setMessage({ ok: true, text: 'Nummernreihe wird fortgesetzt.' })
    } catch (e) {
      setMessage({
        ok: false,
        text:
          e instanceof NumberTooLowError
            ? `Die Nummer muss mindestens ${e.minimum} sein – vergebene Nummern dürfen sich nicht wiederholen.`
            : 'Konnte nicht gespeichert werden.',
      })
    }
  }

  return (
    <Card title="Protokollnummern">
      <div className="space-y-3">
        <p className="text-stone-700 dark:text-stone-300">
          Aufbau: <strong>Kürzel – Jahr – laufende Nummer</strong>. Jedes Kürzel hat seine eigene
          Reihe, die jedes Jahr neu bei 0001 beginnt. Die Nummer wird erst beim Abschluss vergeben.
        </p>
        <div className="rounded-xl bg-stone-100 p-3 dark:bg-stone-800">
          <p className="text-sm text-stone-600 dark:text-stone-400">Nächste Protokollnummer</p>
          <p className="font-mono text-2xl font-bold" data-testid="next-number">
            {info.next}
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {info.current === 0
              ? `Noch kein Protokoll mit ${info.prefix} in ${info.year}.`
              : `Zuletzt vergeben: Nr. ${info.current} in ${info.year}.`}
            {info.deviceCode && ` Gerätekürzel ${info.deviceCode} (siehe Einstellungen).`}
          </p>
        </div>
        {changed && (
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Neues Kürzel: Es beginnt eine neue Nummernreihe. Bereits vergebene Nummern bleiben
            unverändert.
          </p>
        )}
        <details>
          <summary className="min-h-12 cursor-pointer py-3 font-semibold text-brand-700 dark:text-brand-300">
            Bestehende Nummernreihe fortsetzen
          </summary>
          <div className="space-y-2">
            <TextField
              label={`Nächste laufende Nummer für ${info.prefix} in ${info.year}`}
              hint="Zum Beispiel, wenn ihr bisher Papierformulare nummeriert habt. Nur höhere Nummern sind möglich."
              inputMode="numeric"
              value={start}
              onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))}
            />
            <Button variant="secondary" disabled={!start || !!changed} onClick={() => void apply()}>
              Übernehmen
            </Button>
            {changed && <p className="text-sm">Das neue Kürzel wird gerade gespeichert …</p>}
            {message && (
              <p
                role="status"
                className={`font-semibold ${message.ok ? 'text-brand-700 dark:text-brand-300' : 'text-red-700 dark:text-red-400'}`}
              >
                {message.text}
              </p>
            )}
          </div>
        </details>
      </div>
    </Card>
  )
}
