import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function PageHeader({
  title,
  back,
  backLabel = 'Zurück',
  action,
}: {
  title: string
  back?: string
  backLabel?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4">
      {back && (
        <Link
          to={back}
          className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-lg px-2 font-semibold text-brand-700 dark:text-brand-300"
        >
          <span aria-hidden="true">‹</span> {backLabel}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {action}
      </div>
    </div>
  )
}
