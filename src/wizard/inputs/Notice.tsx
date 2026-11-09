import type { ReactNode } from 'react'
import type { IssueLevel } from '../../form/validation'

const styles: Record<IssueLevel, string> = {
  danger: 'border-red-700 bg-red-50 text-red-950 dark:bg-red-950 dark:text-red-50',
  warning: 'border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50',
  blocking: 'border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50',
  info: 'border-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-50',
}

const icons: Record<IssueLevel, string> = { danger: '⛔', warning: '⚠', blocking: '⚠', info: 'ℹ' }

export function Notice({ level, children }: { level: IssueLevel; children: ReactNode }) {
  return (
    <div
      role={level === 'danger' ? 'alert' : undefined}
      className={`flex gap-2 rounded-xl border-l-4 p-3 font-semibold ${styles[level]}`}
    >
      <span aria-hidden="true">{icons[level]}</span>
      <div>{children}</div>
    </div>
  )
}
