import { useState } from 'react'
import type { Answers } from '../../domain/types'
import type { FormStep } from '../../form/schema'
import type { makeLookup } from '../../form/validation'
import { QuickMode } from './QuickMode'
import { quickOpenCount } from './quickCards'

/** Starts the quick mode for the yes/no questions of this step (shown while some are open). */
export function QuickStartButton({
  step,
  answers,
  lookup,
  treeId,
  title,
}: {
  step: FormStep
  answers: Answers
  lookup: ReturnType<typeof makeLookup>
  treeId?: string
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const count = quickOpenCount(step, answers, lookup)
  if (count < 2 && !open) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl border-2 border-accent-500 bg-white px-4 text-lg font-semibold dark:bg-stone-900"
      >
        <span aria-hidden="true">⚡</span> Schnellmodus: Karte für Karte
        <span className="text-base font-normal text-stone-600 dark:text-stone-400">
          ({count} offen)
        </span>
      </button>
      {open && (
        <QuickMode
          step={step}
          answers={answers}
          lookup={lookup}
          treeId={treeId}
          title={title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
