import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { UndoContext, UNDO_SECONDS, type UndoOffer } from './undo'

export function UndoProvider({ children }: { children: ReactNode }) {
  const [offer, setOffer] = useState<(UndoOffer & { id: number }) | null>(null)
  const show = useCallback((o: UndoOffer) => setOffer({ ...o, id: Date.now() }), [])

  useEffect(() => {
    if (!offer) return
    const t = window.setTimeout(() => setOffer(null), UNDO_SECONDS * 1000)
    return () => window.clearTimeout(t)
  }, [offer])

  return (
    <UndoContext.Provider value={show}>
      {children}
      {offer && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-40 z-40 mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-stone-900 p-3 pl-4 text-white shadow-xl md:bottom-28 dark:bg-stone-100 dark:text-stone-900"
        >
          <p className="flex-1">{offer.message}</p>
          <button
            type="button"
            onClick={() => {
              setOffer(null)
              void offer.undo()
            }}
            className="min-h-12 rounded-xl px-4 font-bold text-accent-300 underline dark:text-brand-700"
          >
            Rückgängig
          </button>
          <button
            type="button"
            aria-label="Hinweis schließen"
            onClick={() => setOffer(null)}
            className="flex size-10 items-center justify-center rounded-full text-xl"
          >
            ×
          </button>
        </div>
      )}
    </UndoContext.Provider>
  )
}
