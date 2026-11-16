import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { glossaryEntry, splitTerms, type GlossaryEntry } from './glossary'

/** Text in which technical terms are underlined and explain themselves when tapped. */
export function GlossaryText({ text }: { text: string }) {
  const parts = splitTerms(text)
  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <TermButton key={i} text={part.text} entry={part.entry} />
        ),
      )}
    </>
  )
}

function TermButton({ text, entry }: { text: string; entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false)
  const onClick = (e: MouseEvent) => {
    // Inside a <label> the tap must not toggle the input.
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        title={`Begriff erklären: ${entry.term}`}
        className="cursor-help underline decoration-brand-700 decoration-dotted decoration-2 underline-offset-4 dark:decoration-brand-300"
      >
        {text}
      </button>
      {open && <TermSheet entry={entry} onClose={() => setOpen(false)} />}
    </>
  )
}

/** Bottom sheet with the explanation; related terms switch the content. */
export function TermSheet({ entry, onClose }: { entry: GlossaryEntry; onClose: () => void }) {
  const [current, setCurrent] = useState(entry)
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onClose])

  const related = (current.see ?? []).map(glossaryEntry).filter((e) => !!e)

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
        className="pb-safe w-full max-w-lg space-y-3 rounded-t-2xl bg-white p-5 text-left text-base font-normal text-stone-900 shadow-xl md:rounded-2xl dark:bg-stone-900 dark:text-stone-100"
      >
        <div className="flex items-start gap-3">
          <h2 id={titleId} className="flex-1 pt-2 text-xl font-bold">
            {current.term}
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
        <p className="leading-relaxed">{current.text}</p>
        {related.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-600 dark:text-stone-400">Siehe auch:</span>
            {related.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setCurrent(r)}
                className="min-h-10 rounded-full bg-sky-100 px-3 text-sm font-semibold text-sky-900 dark:bg-sky-900 dark:text-sky-100"
              >
                {r.term}
              </button>
            ))}
          </div>
        )}
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Alle Begriffe findest du unter Hilfe → Begriffe A–Z.
        </p>
      </div>
    </div>,
    document.body,
  )
}
