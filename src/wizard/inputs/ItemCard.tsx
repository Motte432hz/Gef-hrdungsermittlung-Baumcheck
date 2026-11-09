import type { ReactNode } from 'react'

export function ItemCard({ children, tone }: { children: ReactNode; tone?: 'bad' | 'danger' }) {
  const border =
    tone === 'danger'
      ? 'border-red-700'
      : tone === 'bad'
        ? 'border-amber-600'
        : 'border-stone-200 dark:border-stone-800'
  return (
    <div className={`space-y-3 rounded-2xl border-2 bg-white p-4 dark:bg-stone-900 ${border}`}>
      {children}
    </div>
  )
}

export function PrefilledBadge({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-100 p-2 pl-3 dark:bg-stone-800">
      <span className="flex-1 text-sm font-semibold">
        Aus Standard-Ausrüstung vorbelegt – bitte prüfen
      </span>
      <button
        type="button"
        onClick={onConfirm}
        className="min-h-12 rounded-xl border-2 border-brand-700 px-4 font-semibold text-brand-700 dark:border-brand-300 dark:text-brand-300"
      >
        Stimmt so
      </button>
    </div>
  )
}
