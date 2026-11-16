import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Bottom sheet on phones, centred dialog on larger screens. Escape or a tap outside closes it. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pb-safe max-h-[85dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5 text-left text-base font-normal text-stone-900 shadow-xl md:rounded-2xl dark:bg-stone-900 dark:text-stone-100"
      >
        <div className="flex items-start gap-3">
          <h2 id={titleId} className="flex-1 pt-2 text-xl font-bold">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600"
          >
            Schließen
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
