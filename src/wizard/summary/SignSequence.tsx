import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { GeoPosition } from '../../domain/types'
import type { RequiredSignature } from '../../report/signatures'
import { ROLE_LABELS } from '../../domain/roles'
import { personLabel } from '../../domain/people'
import { quickPosition } from '../../lib/quickPosition'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { SignatureCanvas } from '../../components/SignatureField'
import { Button } from '../../components/Button'
import { Toggle } from '../../components/form/Field'
import { saveSignature } from './saveSignature'

const key = (r: RequiredSignature) => `${r.member.id}:${r.statement}`
const missing = (r: RequiredSignature) => !r.signature || r.outdated

/**
 * Everyone signs one after the other on a full screen; between two people the device is
 * handed over, so each person sees their own name and statement.
 */
export function SignSequence({
  reqs,
  statements,
  assessmentId,
  contentHash,
  supervisorName,
  onClose,
}: {
  reqs: RequiredSignature[]
  statements: { supervisor: string; member: string }
  assessmentId: string
  contentHash: string
  supervisorName?: string
  onClose: () => void
}) {
  // Who still had to sign when the sequence started (fixed, so the order stays stable).
  const [queue] = useState(() => reqs.filter(missing).map(key))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'handover' | 'sign'>('handover')
  const req = reqs.find((r) => key(r) === queue[index])
  const done = index >= queue.length

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const next = () => {
    setIndex((i) => i + 1)
    setPhase('handover')
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unterschreiben"
      className="pt-safe pb-safe fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100"
    >
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-2 dark:border-stone-800">
        <p className="font-semibold text-stone-600 dark:text-stone-400">
          {done ? 'Fertig' : `Unterschrift ${index + 1} von ${queue.length}`}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-xl px-3 font-semibold text-brand-700 dark:text-brand-300"
        >
          {done ? 'Schließen' : 'Abbrechen'}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        {done || !req ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p aria-hidden="true" className="text-6xl">
              ✅
            </p>
            <h2 className="text-2xl font-bold">Alle haben unterschrieben</h2>
            <p className="text-lg">Gib das Gerät an die Aufsicht zurück.</p>
            <Button className="min-h-14 w-full max-w-sm text-lg" onClick={onClose}>
              Zurück zur Übersicht
            </Button>
          </div>
        ) : phase === 'handover' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p aria-hidden="true" className="text-6xl">
              🤝
            </p>
            <p className="text-lg">
              {index === 0 ? 'Zuerst unterschreibt' : 'Gerät weitergeben an'}
            </p>
            <h2 className="text-3xl font-bold">{personLabel(req.member)}</h2>
            <p className="text-stone-600 dark:text-stone-400">
              {req.member.roles.map((r) => ROLE_LABELS[r]).join(', ') || 'ohne Rolle'}
            </p>
            <Button className="min-h-16 w-full max-w-sm text-lg" onClick={() => setPhase('sign')}>
              Ich bin {req.member.name} – weiter
            </Button>
            <button
              type="button"
              onClick={next}
              className="min-h-12 font-semibold text-stone-600 underline dark:text-stone-400"
            >
              Überspringen – unterschreibt später
            </button>
          </div>
        ) : (
          <SignStep
            key={key(req)}
            req={req}
            statement={req.statement === 'supervisor' ? statements.supervisor : statements.member}
            assessmentId={assessmentId}
            contentHash={contentHash}
            supervisorName={supervisorName}
            onSaved={next}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}

function SignStep({
  req,
  statement,
  assessmentId,
  contentHash,
  supervisorName,
  onSaved,
}: {
  req: RequiredSignature
  statement: string
  assessmentId: string
  contentHash: string
  supervisorName?: string
  onSaved: () => void
}) {
  const position = useRef<Promise<GeoPosition | undefined>>(quickPosition())
  const [useStored, setUseStored] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const stored = useLiveQuery(
    async () =>
      req.member.workerId ? (await db.workers.get(req.member.workerId))?.signature : undefined,
    [req.member.workerId],
  )
  const storedUrl = useObjectUrl(useStored ? stored : undefined)

  const save = async (image: Blob | undefined) => {
    setSaving(true)
    setError(undefined)
    try {
      await saveSignature({
        assessmentId,
        req,
        image: image ?? stored!,
        method: image ? 'drawn' : 'stored',
        confirmedBy: image ? undefined : supervisorName,
        contentHash,
        position: position.current,
      })
      onSaved()
    } catch (e) {
      console.error(e)
      setError('Unterschrift konnte nicht gespeichert werden. Bitte erneut versuchen.')
      setSaving(false)
    }
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">{personLabel(req.member)}</h2>
        <p className="text-stone-600 dark:text-stone-400">
          {req.member.roles.map((r) => ROLE_LABELS[r]).join(', ') || 'ohne Rolle'}
        </p>
      </div>
      <blockquote className="border-l-4 border-brand-700 pl-3 text-lg leading-relaxed italic">
        „{statement}“
      </blockquote>
      {useStored ? (
        <div className="space-y-3">
          <img
            src={storedUrl}
            alt={`Hinterlegte Unterschrift ${req.member.name}`}
            className="h-28 w-full rounded-xl border border-stone-200 bg-white object-contain"
          />
          <Toggle
            label={`Ich${supervisorName ? ` (${supervisorName})` : ''} bestätige: ${personLabel(req.member)} ist anwesend und hat der Erklärung zugestimmt.`}
            checked={confirmed}
            onChange={setConfirmed}
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={!confirmed || saving} onClick={() => void save(undefined)}>
              Übernehmen
            </Button>
            <Button variant="secondary" onClick={() => setUseStored(false)}>
              Doch selbst unterschreiben
            </Button>
          </div>
        </div>
      ) : (
        <>
          <SignatureCanvas label={req.member.name} tall onDone={(b) => void save(b)} />
          {stored && (
            <button
              type="button"
              onClick={() => setUseStored(true)}
              className="min-h-12 self-start font-semibold text-brand-700 underline dark:text-brand-300"
            >
              Hinterlegte Unterschrift verwenden
            </button>
          )}
        </>
      )}
      {saving && <p role="status">Unterschrift wird gespeichert …</p>}
      {error && <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>}
    </>
  )
}
