import { useState } from 'react'
import { useWizard } from '../WizardContext'
import { formatDecimal } from '../../domain/geo'
import { emergencyText } from '../../domain/emergency'

export function EmergencyCard() {
  const { assessment } = useWizard()
  const [shared, setShared] = useState(false)
  const val = (id: string) => {
    const v = assessment.answers[id]?.value
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }
  const text = emergencyText({
    address: val('site.address'),
    coords: assessment.position ? formatDecimal(assessment.position) : undefined,
    w3w: val('site.w3w'),
    access: val('site.rescueAccess'),
    hospital: val('site.hospital'),
  })

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Notfallinfo Einsatzort', text })
      else await navigator.clipboard.writeText(text)
      setShared(true)
    } catch {
      // Share sheet closed – nothing to do.
    }
  }

  return (
    <section
      aria-label="Notfallinfo"
      className="space-y-3 rounded-2xl border-2 border-red-700 bg-red-50 p-4 text-red-950 dark:bg-red-950 dark:text-red-50"
    >
      <h2 className="text-xl font-bold">Notfallinfo</h2>
      {text ? (
        <pre className="font-sans text-base whitespace-pre-wrap">{text}</pre>
      ) : (
        <p>Noch keine Angaben. Adresse oder GPS-Position eintragen.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <a
          href="tel:112"
          className="inline-flex min-h-14 items-center rounded-xl bg-red-700 px-5 text-lg font-bold text-white"
        >
          📞 112 anrufen
        </a>
        {text && (
          <button
            type="button"
            onClick={() => void share()}
            className="min-h-14 rounded-xl border-2 border-red-700 px-5 font-semibold"
          >
            {shared ? '✓ Geteilt' : 'Notfallinfo teilen'}
          </button>
        )}
      </div>
    </section>
  )
}
