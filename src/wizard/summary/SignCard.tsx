import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { addSignature, removeSignatures } from '../../db/repo'
import type { Signature } from '../../domain/types'
import { signatureMethodText, type RequiredSignature } from '../../report/signatures'
import { ROLE_LABELS } from '../../domain/roles'
import { SignatureCanvas } from '../../components/SignatureField'
import { Button } from '../../components/Button'
import { Toggle } from '../../components/form/Field'
import { toStoredFile } from '../../lib/storedFile'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { quickPosition } from '../../lib/quickPosition'
import { formatDecimal } from '../../domain/geo'

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export function SignCard({
  req,
  statementText,
  assessmentId,
  contentHash,
  supervisorName,
}: {
  req: RequiredSignature
  statementText: string
  assessmentId: string
  contentHash: string
  supervisorName?: string
}) {
  const { member, statement, signature, outdated } = req
  const [mode, setMode] = useState<'idle' | 'draw' | 'stored'>('idle')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const stored = useLiveQuery(
    async () => (member.workerId ? (await db.workers.get(member.workerId))?.signature : undefined),
    [member.workerId],
  )
  const imageUrl = useObjectUrl(signature?.image)
  const storedUrl = useObjectUrl(mode === 'stored' ? stored : undefined)
  const valid = signature && !outdated

  const save = async (image: Blob | undefined, method: Signature['method']) => {
    setSaving(true)
    setError(undefined)
    try {
      const file = image ? await toStoredFile(image, 'image/png') : stored!
      const position = await quickPosition()
      await addSignature(db, assessmentId, {
        memberId: member.id,
        name: member.name,
        roles: member.roles,
        statement,
        method,
        confirmedBy: method === 'stored' ? supervisorName : undefined,
        image: file,
        signedAt: new Date().toISOString(),
        position,
        contentHash,
      })
      setMode('idle')
    } catch (e) {
      console.error(e)
      setError('Unterschrift konnte nicht gespeichert werden. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li
      aria-label={`Unterschrift ${member.name}`}
      className={`space-y-3 rounded-2xl border-2 bg-white p-4 dark:bg-stone-900 ${
        valid
          ? 'border-brand-700'
          : outdated
            ? 'border-amber-600'
            : 'border-stone-200 dark:border-stone-700'
      }`}
    >
      <div>
        <p className="text-lg font-semibold">
          {valid && <span aria-hidden="true">✓ </span>}
          {member.name}
          {member.company && <span className="font-normal"> ({member.company})</span>}
        </p>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {member.roles.map((r) => ROLE_LABELS[r]).join(', ') || 'ohne Rolle'}
        </p>
      </div>
      <blockquote className="border-l-4 border-stone-300 pl-3 italic dark:border-stone-600">
        „{statementText}“
      </blockquote>

      {signature && mode === 'idle' && (
        <div className="space-y-2">
          <img
            src={imageUrl}
            alt={`Unterschrift ${member.name}`}
            className="h-24 w-full rounded-xl border border-stone-200 bg-white object-contain"
          />
          <p className="text-sm text-stone-700 dark:text-stone-300">
            {signatureMethodText(signature)} · {fmtTime(signature.signedAt)}
            {signature.position && ` · GPS ${formatDecimal(signature.position)}`}
          </p>
          {outdated && (
            <p role="alert" className="font-semibold text-amber-800 dark:text-amber-300">
              ⚠ Die Angaben wurden nach dieser Unterschrift geändert. Bitte erneut unterschreiben.
            </p>
          )}
          <Button
            variant="secondary"
            onClick={() =>
              void removeSignatures(db, assessmentId, member.id, statement).then(() =>
                setMode('draw'),
              )
            }
          >
            Neu unterschreiben
          </Button>
        </div>
      )}

      {!signature && mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMode('draw')}>✍ Jetzt unterschreiben</Button>
          {stored && (
            <Button variant="secondary" onClick={() => setMode('stored')}>
              Hinterlegte Unterschrift verwenden
            </Button>
          )}
        </div>
      )}

      {mode === 'draw' && (
        <SignatureCanvas
          label=""
          onDone={(blob) => void save(blob, 'drawn')}
          onCancel={() => setMode('idle')}
        />
      )}

      {mode === 'stored' && (
        <div className="space-y-3">
          <img
            src={storedUrl}
            alt={`Hinterlegte Unterschrift ${member.name}`}
            className="h-24 w-full rounded-xl border border-stone-200 bg-white object-contain"
          />
          <Toggle
            label={`Ich${supervisorName ? ` (${supervisorName})` : ''} bestätige: ${member.name} ist anwesend und hat der Erklärung zugestimmt.`}
            checked={confirmed}
            onChange={setConfirmed}
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={!confirmed || saving} onClick={() => void save(undefined, 'stored')}>
              Übernehmen
            </Button>
            <Button variant="secondary" onClick={() => setMode('idle')}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
      {saving && <p role="status">Unterschrift wird gespeichert …</p>}
      {error && <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>}
    </li>
  )
}
