/** Large toggle chips (multi-select). */
export function ChipGroup<T extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string
  hint?: string
  options: { value: T; label: string }[]
  value: T[]
  onChange: (value: T[]) => void
}) {
  return (
    <fieldset>
      <legend className="mb-1 font-semibold">{legend}</legend>
      {hint && <p className="mb-2 text-sm text-stone-600 dark:text-stone-400">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="inline-flex min-h-12 cursor-pointer items-center rounded-full border-2 border-stone-300 px-4 font-semibold has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-brand-500 dark:border-stone-600"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={value.includes(o.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? options.map((x) => x.value).filter((x) => x === o.value || value.includes(x))
                    : value.filter((x) => x !== o.value),
                )
              }
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
