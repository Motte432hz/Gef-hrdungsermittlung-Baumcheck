import { useState } from 'react'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { finalizeAssessment, NotReadyError } from '../../report/finalize'
import { loadFonts } from '../../pdf/fonts'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'

export function CompleteCard({ ready, assessmentId }: { ready: boolean; assessmentId: string }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const complete = async () => {
    if (
      !window.confirm(
        'Protokoll jetzt abschließen? Danach kann es nicht mehr geändert werden – Korrekturen nur als neue Version.',
      )
    )
      return
    setBusy(true)
    setError(undefined)
    try {
      const done = await finalizeAssessment(db, assessmentId, await loadFonts())
      navigate(`/protokoll/${done.id}`, { replace: true })
    } catch (e) {
      console.error(e)
      setError(
        e instanceof NotReadyError
          ? e.message
          : 'Das PDF konnte nicht erstellt werden. Bitte erneut versuchen.',
      )
      setBusy(false)
    }
  }

  return (
    <Card>
      <Button
        className="min-h-16 w-full text-lg"
        disabled={!ready || busy}
        onClick={() => void complete()}
      >
        {busy ? 'PDF wird erstellt …' : 'Abschließen & PDF erstellen'}
      </Button>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        {ready
          ? 'Das Protokoll wird gesperrt, nummeriert und als PDF gespeichert – auch ohne Internet.'
          : 'Möglich, sobald alle Punkte erledigt sind und alle unterschrieben haben.'}
      </p>
      {error && (
        <p role="alert" className="mt-2 font-semibold text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </Card>
  )
}
