import { Button } from './Button'

/** Sticky save button above the bottom navigation. */
export const SAVE_ERROR =
  'Speichern fehlgeschlagen. Bitte erneut versuchen. Bleibt der Fehler, die App nicht im privaten Browserfenster verwenden.'

export function SaveBar({
  saving,
  saved,
  error,
  label = 'Speichern',
}: {
  saving?: boolean
  saved?: boolean
  error?: string
  label?: string
}) {
  return (
    <div className="sticky bottom-20 z-[5] -mx-4 mt-6 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur md:bottom-0 dark:border-stone-800 dark:bg-stone-950/95">
      {error && (
        <p role="alert" className="mb-2 font-semibold text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="flex-1 md:flex-none">
          {saving ? 'Speichert …' : label}
        </Button>
        <span role="status" className="font-semibold text-brand-700 dark:text-brand-300">
          {saved ? '✓ Gespeichert' : ''}
        </span>
      </div>
    </div>
  )
}
