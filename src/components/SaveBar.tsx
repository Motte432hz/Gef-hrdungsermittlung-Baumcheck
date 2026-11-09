import { Button } from './Button'

/** Sticky save button above the bottom navigation. */
export function SaveBar({
  saving,
  saved,
  label = 'Speichern',
}: {
  saving?: boolean
  saved?: boolean
  label?: string
}) {
  return (
    <div className="sticky bottom-20 z-[5] -mx-4 mt-6 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur md:bottom-0 dark:border-stone-800 dark:bg-stone-950/95">
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
