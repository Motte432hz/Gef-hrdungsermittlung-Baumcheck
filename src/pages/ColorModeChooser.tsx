import { useState } from 'react'
import { Link } from 'react-router'
import { useOrganization } from '../app/useOrganization'
import { db } from '../db/db'
import { saveOrganization } from '../db/profiles'
import { logoColors } from '../lib/logoColors'

/**
 * "Farben": BaumCheck green or the company colours. Choosing company colours without a
 * colour set yet takes them from the logo automatically.
 */
export function ColorModeChooser() {
  const org = useOrganization()
  const [message, setMessage] = useState<string>()
  if (!org) return null
  const branded = !!(org.brandInApp && org.brandColor)

  const choose = async (wantBranded: boolean) => {
    setMessage(undefined)
    if (!wantBranded) return saveOrganization(db, org.id, { brandInApp: false })
    if (org.brandColor) return saveOrganization(db, org.id, { brandInApp: true })
    if (!org.logo) {
      setMessage('Noch kein Logo und keine Firmenfarbe hinterlegt.')
      return
    }
    try {
      const [c1, c2] = await logoColors(org.logo)
      if (!c1) {
        setMessage('Im Logo wurde keine Farbe erkannt. Bitte im Firmenprofil eine Farbe wählen.')
        return
      }
      await saveOrganization(db, org.id, { brandColor: c1, brandColor2: c2, brandInApp: true })
    } catch {
      setMessage('Die Farben konnten nicht aus dem Logo gelesen werden.')
    }
  }

  const option = (value: boolean, label: string) => (
    <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-stone-300 px-2 text-center font-semibold has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-brand-500 dark:border-stone-600">
      <input
        type="radio"
        name="colorMode"
        checked={branded === value}
        onChange={() => void choose(value)}
        className="sr-only"
      />
      {label}
    </label>
  )

  return (
    <fieldset className="mt-4">
      <legend className="mb-2 font-semibold">Farben</legend>
      <div className="grid grid-cols-2 gap-2">
        {option(false, 'BaumCheck')}
        {option(true, 'Firmenfarben')}
      </div>
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}{' '}
          <Link
            to="/profile/firma"
            className="font-semibold text-brand-700 underline dark:text-brand-300"
          >
            Zum Firmenprofil
          </Link>
        </p>
      )}
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        Hell, Dunkel und Firmenfarben lassen sich kombinieren. Farben genauer einstellen: Profile →
        Firma → Erscheinungsbild.
      </p>
    </fieldset>
  )
}
