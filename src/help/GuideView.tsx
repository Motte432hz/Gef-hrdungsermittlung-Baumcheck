import { Link } from 'react-router'
import { GlossaryText } from './GlossaryText'
import type { Guide } from './guides'

/** Numbered steps of a guide with tips and a link to where to start. */
export function GuideView({ guide, showStart = true }: { guide: Guide; showStart?: boolean }) {
  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {guide.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-700 font-bold text-white"
            >
              {i + 1}
            </span>
            <span className="pt-1 leading-relaxed">
              <GlossaryText text={step} />
            </span>
          </li>
        ))}
      </ol>
      {guide.tips && (
        <ul className="space-y-1 rounded-xl bg-sky-50 p-3 dark:bg-sky-950">
          {guide.tips.map((tip, i) => (
            <li key={i} className="leading-relaxed">
              <span aria-hidden="true">💡 </span>
              {tip}
            </li>
          ))}
        </ul>
      )}
      {showStart && guide.start && (
        <Link
          to={guide.start.to}
          className="inline-flex min-h-12 items-center rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600"
        >
          {guide.start.label} ›
        </Link>
      )}
    </div>
  )
}
