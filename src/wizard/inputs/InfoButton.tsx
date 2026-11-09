import { useId, useState, type ReactNode } from 'react'

/** Label row with an (i) button that reveals the explanation inline. */
export function ItemLabel({
  label,
  info,
  required,
  proposal,
  as: Tag = 'p',
  htmlFor,
}: {
  label: ReactNode
  info?: string
  required?: boolean
  proposal?: boolean
  as?: 'p' | 'label' | 'legend'
  htmlFor?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Tag
          className="flex-1 pt-2 text-lg font-semibold leading-snug"
          {...(htmlFor ? { htmlFor } : {})}
        >
          {label}
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
        {info && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            aria-label={open ? 'Erklärung ausblenden' : 'Erklärung anzeigen'}
            onClick={() => setOpen(!open)}
            className={`flex size-12 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold italic ${
              open
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-stone-300 text-brand-700 dark:border-stone-600 dark:text-brand-300'
            }`}
          >
            i
          </button>
        )}
      </div>
      {info && open && (
        <p
          id={id}
          className="rounded-xl bg-sky-50 p-3 text-stone-800 dark:bg-sky-950 dark:text-stone-200"
        >
          {info}
        </p>
      )}
    </div>
  )
}
