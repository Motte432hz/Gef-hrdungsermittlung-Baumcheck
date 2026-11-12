import { useState, type InputHTMLAttributes } from 'react'
import { TextArea, TextField } from '../../components/form/Field'
import { toggleMeasure, hasMeasure } from './measures'

/**
 * Text input with local state that writes through on every change (autosave).
 * Local state avoids cursor jumps while the database round-trip is in flight.
 */
export function BufferedText({
  label,
  hint,
  error,
  required,
  multiline,
  initial,
  onSave,
  suggestions,
  ...rest
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  multiline?: boolean
  initial: string
  onSave: (value: string) => void
  /** Quick picks (e.g. typical measures): tap adds, tap again removes. */
  suggestions?: string[]
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'required'>) {
  const [value, setValue] = useState(initial)
  const change = (v: string) => {
    setValue(v)
    onSave(v)
  }
  const input = multiline ? (
    <TextArea
      label={label}
      hint={hint}
      error={error}
      required={required}
      placeholder={rest.placeholder}
      value={value}
      onChange={(e) => change(e.target.value)}
    />
  ) : (
    <TextField
      label={label}
      hint={hint}
      error={error}
      required={required}
      {...rest}
      value={value}
      onChange={(e) => change(e.target.value)}
    />
  )
  if (!suggestions?.length) return input
  return (
    <div className="space-y-2">
      {input}
      <div role="group" aria-label={`Vorschläge: ${label}`} className="flex flex-wrap gap-2">
        {suggestions.map((m) => {
          const on = hasMeasure(value, m)
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => change(toggleMeasure(value, m))}
              className={`min-h-12 rounded-xl border-2 px-3 py-1 text-left text-sm font-semibold ${
                on
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-stone-300 bg-white text-stone-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100'
              }`}
            >
              {on ? '✓ ' : '+ '}
              {m}
            </button>
          )
        })}
      </div>
    </div>
  )
}
