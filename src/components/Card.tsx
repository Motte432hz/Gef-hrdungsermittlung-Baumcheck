import type { ReactNode } from 'react'

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      {title && <h2 className="mb-2 text-lg font-bold">{title}</h2>}
      {children}
    </section>
  )
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-2xl font-bold">{children}</h1>
}
