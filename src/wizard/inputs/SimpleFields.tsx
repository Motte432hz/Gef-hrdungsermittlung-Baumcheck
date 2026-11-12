import { useId, useState } from 'react'
import { DictateButton } from '../../components/form/DictateButton'
import { appendDictation } from '../../lib/speech'
import type { Answer } from '../../domain/types'
import type { NumberItem, TextItem, TimeItem } from '../../form/schema'
import { ItemLabel } from './InfoButton'
import { ItemCard } from './ItemCard'
import { parseDecimal } from '../../lib/number'

type Props<I> = { item: I; answer: Answer | undefined; onChange: (a: Answer | undefined) => void }

const inputClass =
  'block w-full min-h-12 rounded-xl border-2 border-stone-300 bg-white px-3 py-2 text-lg dark:border-stone-600 dark:bg-stone-800'

export function TextItemField({ item, answer, onChange }: Props<TextItem>) {
  const id = useId()
  const stored = typeof answer?.value === 'string' ? answer.value : ''
  const [text, setText] = useState(stored)
  // A value written from elsewhere (e.g. a suggestion taken over) is shown unless the person
  // is typing in this field right now.
  const [focused, setFocused] = useState(false)
  const [lastStored, setLastStored] = useState(stored)
  if (stored !== lastStored) {
    setLastStored(stored)
    if (!focused && stored !== text) setText(stored)
  }
  const change = (v: string) => {
    setText(v)
    onChange(v.trim() ? { value: v } : undefined)
  }
  return (
    <ItemCard>
      <div className="space-y-3" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
        <ItemLabel
          as="label"
          htmlFor={id}
          label={item.label}
          info={item.info}
          required={item.required}
        />
        {item.multiline ? (
          <textarea
            id={id}
            rows={3}
            className={inputClass}
            placeholder={item.placeholder}
            value={text}
            onChange={(e) => change(e.target.value)}
          />
        ) : (
          <input
            id={id}
            className={inputClass}
            placeholder={item.placeholder}
            value={text}
            onChange={(e) => change(e.target.value)}
          />
        )}
        {item.multiline && (
          <DictateButton label={item.label} onText={(t) => change(appendDictation(text, t))} />
        )}
      </div>
    </ItemCard>
  )
}

export function NumberItemField({ item, answer, onChange }: Props<NumberItem>) {
  const id = useId()
  const [text, setText] = useState(
    typeof answer?.value === 'number' ? String(answer.value).replace('.', ',') : '',
  )
  const n = parseDecimal(text)
  const invalid =
    n !== null &&
    (Number.isNaN(n) ||
      (item.min !== undefined && n < item.min) ||
      (item.max !== undefined && n > item.max))
  return (
    <ItemCard>
      <ItemLabel
        as="label"
        htmlFor={id}
        label={item.label}
        info={item.info}
        required={item.required}
      />
      <div className="flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          className={`${inputClass} max-w-40`}
          value={text}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setText(e.target.value)
            const v = parseDecimal(e.target.value)
            onChange(v === null ? undefined : { value: v })
          }}
        />
        {item.unit && <span className="text-lg font-semibold">{item.unit}</span>}
      </div>
      {invalid && (
        <p className="font-semibold text-red-700 dark:text-red-400">
          Bitte einen Wert zwischen {item.min} und {item.max} {item.unit} eingeben.
        </p>
      )}
    </ItemCard>
  )
}

export function TimeItemField({ item, answer, onChange }: Props<TimeItem>) {
  const id = useId()
  return (
    <ItemCard>
      <ItemLabel
        as="label"
        htmlFor={id}
        label={item.label}
        info={item.info}
        required={item.required}
      />
      <input
        id={id}
        type="time"
        className={`${inputClass} max-w-40`}
        value={typeof answer?.value === 'string' ? answer.value : ''}
        onChange={(e) => onChange(e.target.value ? { value: e.target.value } : undefined)}
      />
    </ItemCard>
  )
}
