import { useEffect, useState } from 'react'
import type { Organization, PdfLayout, StoredFile } from '../../domain/types'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Toggle } from '../../components/form/Field'
import { contrast, makePalette } from '../../lib/color'
import { logoColors } from '../../lib/logoColors'
import { loadFonts } from '../../pdf/fonts'
import { buildSamplePdf } from '../../pdf/samplePdf'

export interface AppearanceValue {
  brandColor?: string
  brandInApp: boolean
  brandInPdf: boolean
  pdfLayout: PdfLayout
}

const LAYOUTS: { value: PdfLayout; label: string; text: string }[] = [
  { value: 'standard', label: 'Standard', text: 'Übersichtlich mit allen Angaben, gut lesbar.' },
  {
    value: 'compact',
    label: 'Kompakt',
    text: 'Kleinere Schrift; unauffällige Punkte werden je Abschnitt in einer Zeile zusammengefasst. Weniger Seiten.',
  },
  {
    value: 'table',
    label: 'Tabelle',
    text: 'Klassisch wie ein Formular: Titelbalken, Linien und abwechselnd graue Zeilen.',
  },
]

export function AppearanceCard({
  org,
  logo,
  value,
  onChange,
}: {
  org: Organization
  logo?: StoredFile
  value: AppearanceValue
  onChange: (v: AppearanceValue) => void
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  // Suggest colours whenever the logo changes; pre-select the first if none is chosen yet.
  useEffect(() => {
    if (!logo) return
    let cancelled = false
    logoColors(logo)
      .then((c) => {
        if (cancelled) return
        setSuggestions(c)
        if (!value.brandColor && c[0])
          onChange({ ...value, brandColor: c[0], brandInApp: true, brandInPdf: true })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the logo changes
  }, [logo])

  const palette = value.brandColor ? makePalette(value.brandColor) : undefined

  const preview = async () => {
    // Open the window right away (inside the tap): Safari blocks windows opened after awaits.
    const win = window.open('', '_blank')
    setBusy(true)
    try {
      const pdf = await buildSamplePdf(
        { ...org, logo },
        { layout: value.pdfLayout, brandColor: value.brandInPdf ? value.brandColor : undefined },
        await loadFonts(),
      )
      const url = URL.createObjectURL(
        new Blob([pdf as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
      )
      if (win) win.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 120_000)
    } catch (e) {
      console.error(e)
      win?.close()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Erscheinungsbild">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="font-semibold">Firmenfarbe</p>
          {suggestions.length > 0 && (
            <p className="text-sm text-stone-600 dark:text-stone-400">Aus deinem Logo erkannt:</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {suggestions.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Farbe ${c} wählen`}
                aria-pressed={value.brandColor === c}
                onClick={() => onChange({ ...value, brandColor: c })}
                className={`size-12 rounded-xl border-4 ${value.brandColor === c ? 'border-stone-900 dark:border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-stone-300 px-3 font-semibold dark:border-stone-600">
              Eigene Farbe
              <input
                type="color"
                aria-label="Eigene Farbe wählen"
                value={value.brandColor ?? '#1f5130'}
                onChange={(e) => onChange({ ...value, brandColor: e.target.value })}
                className="size-8 cursor-pointer"
              />
            </label>
            {value.brandColor && (
              <button
                type="button"
                className="min-h-12 px-2 font-semibold underline"
                onClick={() =>
                  onChange({
                    ...value,
                    brandColor: undefined,
                    brandInApp: false,
                    brandInPdf: false,
                  })
                }
              >
                Standardfarbe
              </button>
            )}
          </div>
          {!logo && (
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Lade oben ein Logo hoch – die App schlägt dann passende Farben vor.
            </p>
          )}
          {palette && (
            <div className="flex flex-wrap items-center gap-2" aria-label="Vorschau der Farben">
              <span
                className="rounded-xl px-4 py-2 font-semibold text-white"
                style={{ backgroundColor: palette[700] }}
              >
                Knopf
              </span>
              <span
                className="rounded-xl px-4 py-2 font-semibold"
                style={{ backgroundColor: palette[100], color: palette[900] }}
              >
                Hinweis
              </span>
              <span className="text-sm text-stone-600 dark:text-stone-400">
                Kontrast {contrast(palette[700], '#ffffff').toFixed(1)} : 1 – gut lesbar
              </span>
            </div>
          )}
          <Toggle
            label="Farbe in der App verwenden"
            hint="Knöpfe, Markierungen und Leisten in der Firmenfarbe."
            checked={value.brandInApp && !!value.brandColor}
            onChange={(on) => onChange({ ...value, brandInApp: on })}
          />
          <Toggle
            label="Farbe im PDF verwenden"
            hint="Überschriften und Kopfleiste in der Firmenfarbe; bleibt in Schwarzweiß gut druckbar."
            checked={value.brandInPdf && !!value.brandColor}
            onChange={(on) => onChange({ ...value, brandInPdf: on })}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 font-semibold">PDF-Layout</legend>
          {LAYOUTS.map((l) => (
            <label
              key={l.value}
              className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 p-3 has-checked:border-brand-700 dark:border-stone-600"
            >
              <input
                type="radio"
                name="pdfLayout"
                value={l.value}
                checked={value.pdfLayout === l.value}
                onChange={() => onChange({ ...value, pdfLayout: l.value })}
                className="mt-1 size-5 accent-brand-700"
              />
              <span>
                <span className="block font-semibold">{l.label}</span>
                <span className="block text-sm text-stone-600 dark:text-stone-400">{l.text}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button variant="secondary" onClick={() => void preview()} disabled={busy}>
          {busy ? 'Muster wird erstellt …' : 'Muster-PDF ansehen'}
        </Button>
      </div>
    </Card>
  )
}
