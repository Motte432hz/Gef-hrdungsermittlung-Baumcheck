import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function ListLink({ to, title, meta }: { to: string; title: ReactNode; meta?: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="flex min-h-16 items-center justify-between gap-3 px-4 py-2 hover:bg-stone-100 dark:hover:bg-stone-800"
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">{title}</span>
          {meta && (
            <span className="block truncate text-sm text-stone-600 dark:text-stone-400">
              {meta}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-2xl text-stone-400">
          ›
        </span>
      </Link>
    </li>
  )
}

export function LinkList({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
      {children}
    </ul>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center text-stone-600 dark:border-stone-700 dark:text-stone-400">
      {children}
    </p>
  )
}
