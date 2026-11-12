import { useState, type InputHTMLAttributes } from 'react'
import { TextArea, TextField } from '../../components/form/Field'
import { toggleMeasure, hasMeasure } from './measures'
import { DictateButton } from '../../components/form/DictateButton'
import { appendDictation } from '../../lib/speech'

/**
 * Text input with local state that writes through on every change (autosave).
 * Local state avoids cursor jumps while the database round-trip is in flight. A value written
 * from elsewhere (e.g. a suggestion taken over) is shown as soon as the field is not focused.
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
  const [focused, setFocused] = useState(false)
  const [lastInitial, setLastInitial] = useState(initial)
  if (initial !== lastInitial) {
    setLastInitial(initial)
    if (!focused && initial !== value) setValue(initial)
  }
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
  const tracked = (
    <div className="space-y-2" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      {input}
      {multiline && (
        <DictateButton label={label} onText={(t) => change(appendDictation(value, t))} />
      )}
    </div>
  )
  if (!suggestions?.length) return tracked
  return (
    <div className="space-y-2">
      {tracked}
      <div role="group" aria-label="Vorschläge zum Antippen" className="flex flex-wrap gap-2">
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
