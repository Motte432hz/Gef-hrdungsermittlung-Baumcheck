import type { SaveState } from './useAutosave'
import { SAVE_ERROR } from './SaveBar'

/** Status line for pages that save automatically. */
export function SaveStatus({ state, hint }: { state: SaveState; hint?: string }) {
  return (
    <div className="sticky bottom-20 z-[5] -mx-4 mt-6 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur md:bottom-0 dark:border-stone-800 dark:bg-stone-950/95">
      {state === 'error' ? (
        <p role="alert" className="font-semibold text-red-700 dark:text-red-400">
          {SAVE_ERROR}
        </p>
      ) : (
        <p role="status" className="font-semibold text-brand-700 dark:text-brand-300">
          {state === 'saving'
            ? 'Speichert …'
            : state === 'saved'
              ? '✓ Gespeichert'
              : (hint ?? 'Änderungen werden automatisch gespeichert.')}
        </p>
      )}
    </div>
  )
}
