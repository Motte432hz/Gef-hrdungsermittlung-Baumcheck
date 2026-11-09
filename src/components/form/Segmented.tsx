import { useId } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

const tone = {
  neutral: 'has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-white',
  good: 'has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-white',
  bad: 'has-checked:border-red-700 has-checked:bg-red-700 has-checked:text-white',
  muted: 'has-checked:border-stone-600 has-checked:bg-stone-600 has-checked:text-white',
}

/** Large radio button group (gloves-friendly). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  tones,
}: {
  label: string
  options: SegmentOption<T>[]
  value: T | undefined
  onChange: (value: T) => void
  tones?: Partial<Record<T, keyof typeof tone>>
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-stone-300 px-2 text-center font-semibold has-focus-visible:outline-3 has-focus-visible:outline-brand-500 dark:border-stone-600 ${tone[tones?.[o.value] ?? 'neutral']}`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
