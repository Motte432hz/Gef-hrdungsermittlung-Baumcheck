import { useState } from 'react'
import {
  ACTIVITY_LABELS,
  hazardsForSpecies,
  plannedActivities,
  type TreeSpecies,
} from '../../form/species'
import { useWizard } from '../WizardContext'

/** Typical hazards of the species, with advice for the planned work. */
export function SpeciesHazards({ species, compact }: { species: TreeSpecies; compact?: boolean }) {
  const { assessment } = useWizard()
  const views = hazardsForSpecies(species, plannedActivities(assessment.answers))
  const [showOthers, setShowOthers] = useState(false)
  // Compact mode (assessment step): collapsed to one line so the checklist stays in view.
  const [expanded, setExpanded] = useState(!compact)
  if (views.length === 0 && !species.note) return null
  const relevant = views.filter((v) => v.relevant)
  const others = views.filter((v) => !v.relevant)

  if (!expanded) {
    return (
      <section
        aria-label={`Typische Gefahren: ${species.de}`}
        className="rounded-2xl border-2 border-amber-600 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-50"
      >
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setExpanded(true)}
          className="flex min-h-12 w-full items-center justify-between gap-2 text-left"
        >
          <span>
            <span className="block font-bold">⚠ Typische Gefahren bei {species.de}</span>
            <span className="block text-sm">
              {views.map((v) => v.hazard.title).join(' · ') || 'Hinweis zur Art'}
            </span>
          </span>
          <span className="shrink-0 font-semibold underline">Anzeigen</span>
        </button>
      </section>
    )
  }

  return (
    <section
      aria-label={`Typische Gefahren: ${species.de}`}
      className="space-y-3 rounded-2xl border-2 border-amber-600 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950 dark:text-amber-50"
    >
      <h3 className="text-lg font-bold">⚠ Typische Gefahren bei {species.de}</h3>
      {species.note && <p className="font-semibold">{species.note}</p>}
      {relevant.length > 0 && (
        <p className="text-sm">Hervorgehoben sind die Hinweise für die geplanten Arbeiten.</p>
      )}
      <ul className="space-y-3">
        {relevant.map((v) => (
          <li key={v.hazard.id} className="rounded-xl bg-white/70 p-3 dark:bg-black/30">
            <p className="font-bold">{v.hazard.title}</p>
            <p className="mt-1">{v.hazard.text}</p>
            {v.advice.length > 0 && (
              <ul className="mt-2 space-y-1">
                {v.advice.map((a) => (
                  <li key={a.key}>
                    <span className="font-semibold">{ACTIVITY_LABELS[a.key]}:</span> {a.text}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={showOthers}
            onClick={() => setShowOthers(!showOthers)}
            className="min-h-12 font-semibold underline"
          >
            {showOthers
              ? 'Weitere Gefahren ausblenden'
              : `Weitere Gefahren dieser Art (${others.length})`}
          </button>
          {showOthers && (
            <ul className="mt-2 space-y-2">
              {others.map((v) => (
                <li key={v.hazard.id}>
                  <span className="font-semibold">{v.hazard.title}:</span> {v.hazard.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
