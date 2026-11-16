import { useState, type MouseEvent } from 'react'
import { Sheet } from '../components/Sheet'
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

/** Sheet with the explanation; related terms switch the content. */
export function TermSheet({ entry, onClose }: { entry: GlossaryEntry; onClose: () => void }) {
  const [current, setCurrent] = useState(entry)
  const related = (current.see ?? []).map(glossaryEntry).filter((e) => !!e)
  return (
    <Sheet title={current.term} onClose={onClose}>
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
    </Sheet>
  )
}
