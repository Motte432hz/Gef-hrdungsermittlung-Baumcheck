import { useId } from 'react'
import type { Answer } from '../../domain/types'
import type { ChoiceItem } from '../../form/schema'
import { selectedOptions } from '../../form/validation'
import { ItemLabel } from './InfoButton'
import { ItemCard } from './ItemCard'
import { Notice } from './Notice'
import { BufferedText } from './BufferedText'

export function ChoiceField({
  item,
  answer,
  onChange,
}: {
  item: ChoiceItem
  answer: Answer | undefined
  onChange: (answer: Answer | undefined) => void
}) {
  const name = useId()
  const multi = item.type === 'multi'
  const values: string[] = Array.isArray(answer?.value)
    ? (answer.value as string[])
    : typeof answer?.value === 'string'
      ? [answer.value]
      : []
  const selected = selectedOptions(item, answer)
  const danger = selected.some((o) => o.severity === 'danger')
  const noteOption = selected.find((o) => o.requiresNote)
  const otherOption = selected.find((o) => o.isOther)

  const toggle = (v: string, checked: boolean) => {
    if (!multi) return onChange({ ...answer, value: v })
    // Keep the option order of the definition.
    const next = item.options
      .map((o) => o.value)
      .filter((x) => (x === v ? checked : values.includes(x)))
    onChange(next.length ? { ...answer, value: next } : undefined)
  }

  return (
    <ItemCard tone={danger ? 'danger' : selected.some((o) => o.warning) ? 'bad' : undefined}>
      <fieldset className="space-y-3">
        <ItemLabel
          as="legend"
          label={item.label}
          info={item.info}
          required={item.required}
          proposal={item.proposal}
        />
        {multi && (
          <p className="text-sm text-stone-600 dark:text-stone-400">Mehrfachauswahl möglich</p>
        )}
        <div className="space-y-2">
          {item.options.map((o) => (
            <label
              key={o.value}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-stone-300 px-3 py-2 has-checked:border-brand-700 has-checked:bg-brand-50 has-focus-visible:outline-3 has-focus-visible:outline-brand-500 dark:border-stone-600 dark:has-checked:border-brand-300 dark:has-checked:bg-brand-900"
            >
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={name}
                value={o.value}
                checked={values.includes(o.value)}
                onChange={(e) => toggle(o.value, e.target.checked)}
                className="size-6 shrink-0 accent-brand-700"
              />
              <span>
                <span className="block font-semibold">{o.label}</span>
                {o.info && (
                  <span className="block text-sm text-stone-600 dark:text-stone-400">{o.info}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {selected
        .filter((o) => o.warning)
        .map((o) => (
          <Notice
            key={o.value}
            level={o.severity === 'danger' ? 'danger' : (o.severity ?? 'warning')}
          >
            {o.warning}
          </Notice>
        ))}
      {otherOption && (
        <BufferedText
          required
          label={`${otherOption.label}: bitte beschreiben`}
          initial={answer?.otherText ?? ''}
          onSave={(otherText) => onChange({ ...answer!, otherText })}
        />
      )}
      {noteOption && (
        <BufferedText
          key={noteOption.value}
          multiline
          required
          label={noteOption.noteLabel ?? 'Begründung'}
          initial={answer?.note ?? ''}
          onSave={(note) => onChange({ ...answer!, note })}
        />
      )}
    </ItemCard>
  )
}
