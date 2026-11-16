import { useId, useState, type ReactNode } from 'react'
import { GlossaryText } from '../../help/GlossaryText'

/**
 * Label row with a "?" button that reveals the explanation inline:
 * what is meant, why it is asked and an example. Technical terms in the label
 * and the explanation are underlined and explain themselves.
 */
export function ItemLabel({
  label,
  info,
  why,
  example,
  required,
  proposal,
  as: Tag = 'p',
  htmlFor,
}: {
  label: ReactNode
  info?: string
  why?: string
  example?: string
  required?: boolean
  proposal?: boolean
  as?: 'p' | 'label' | 'legend'
  htmlFor?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const hasHelp = !!(info || why || example)
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Tag
          className="flex-1 pt-2 text-lg font-semibold leading-snug"
          {...(htmlFor ? { htmlFor } : {})}
        >
          {typeof label === 'string' ? <GlossaryText text={label} /> : label}
          {required && (
            <span className="text-red-700 dark:text-red-400" aria-hidden="true">
              {' '}
              *
            </span>
          )}
          {proposal && (
            <span className="ml-2 inline-block rounded-md bg-sky-100 px-1.5 py-0.5 align-middle text-xs font-semibold text-sky-900 dark:bg-sky-900 dark:text-sky-100">
              Vorschlag
            </span>
          )}
        </Tag>
        {hasHelp && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            aria-label={open ? 'Erklärung ausblenden' : 'Erklärung anzeigen'}
            onClick={() => setOpen(!open)}
            className={`flex size-12 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold ${
              open
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-stone-300 text-brand-700 dark:border-stone-600 dark:text-brand-300'
            }`}
          >
            ?
          </button>
        )}
      </div>
      {hasHelp && open && <HelpPanel id={id} info={info} why={why} example={example} />}
    </div>
  )
}

function HelpPanel({
  id,
  info,
  why,
  example,
}: {
  id: string
  info?: string
  why?: string
  example?: string
}) {
  const parts = [
    { title: 'Worum geht es?', text: info },
    { title: 'Warum ist das wichtig?', text: why },
    { title: 'Beispiel', text: example },
  ].filter((p): p is { title: string; text: string } => !!p.text)
  // A single plain explanation needs no headings.
  const plain = parts.length === 1 && !!info
  return (
    <div
      id={id}
      className="space-y-2 rounded-xl bg-sky-50 p-3 text-stone-800 dark:bg-sky-950 dark:text-stone-200"
    >
      {parts.map((p) => (
        <div key={p.title}>
          {!plain && <p className="text-sm font-bold text-sky-900 dark:text-sky-200">{p.title}</p>}
          <p className="leading-relaxed">
            <GlossaryText text={p.text} />
          </p>
        </div>
      ))}
    </div>
  )
}
