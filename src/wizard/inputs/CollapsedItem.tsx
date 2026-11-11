/** Compact row for an item answered without findings; tap to change the answer. */
export function CollapsedItem({
  label,
  value,
  onExpand,
}: {
  label: string
  value: string
  onExpand: () => void
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-expanded={false}
      aria-label={`${label}: ${value} – ändern`}
      className="flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 border-stone-200 bg-white px-4 py-2 text-left hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800"
    >
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white"
      >
        ✓
      </span>
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      <span className="shrink-0 font-semibold">{value}</span>
      <span className="shrink-0 text-sm text-stone-600 underline dark:text-stone-400">ändern</span>
    </button>
  )
}
