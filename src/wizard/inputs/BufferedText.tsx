import { useState, type InputHTMLAttributes } from 'react'
import { TextArea, TextField } from '../../components/form/Field'

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
  ...rest
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  multiline?: boolean
  initial: string
  onSave: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'required'>) {
  const [value, setValue] = useState(initial)
  const change = (v: string) => {
    setValue(v)
    onSave(v)
  }
  return multiline ? (
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
}
