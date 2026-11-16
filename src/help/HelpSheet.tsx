import { useState } from 'react'
import { Link } from 'react-router'
import { Sheet } from '../components/Sheet'
import { GlossaryText } from './GlossaryText'
import { GuideView } from './GuideView'
import { getGuide, type PageHelp } from './guides'

/** Help for the current page or wizard step, with the matching guides to unfold. */
export function HelpSheet({
  help,
  onClose,
  inWizard = false,
}: {
  help: PageHelp
  onClose: () => void
  /** In the wizard, links that leave the protocol are left out. */
  inWizard?: boolean
}) {
  const [openGuide, setOpenGuide] = useState<string>()
  const related = help.guides.map(getGuide).filter((g) => !!g)
  return (
    <Sheet title={`Hilfe: ${help.title}`} onClose={onClose}>
      <p className="leading-relaxed">
        <GlossaryText text={help.text} />
      </p>
      {help.tips && (
        <ul className="space-y-1 rounded-xl bg-sky-50 p-3 dark:bg-sky-950">
          {help.tips.map((tip, i) => (
            <li key={i} className="leading-relaxed">
              <span aria-hidden="true">💡 </span>
              {tip}
            </li>
          ))}
        </ul>
      )}
      {related.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold">Wie mache ich …?</h3>
          {related.map((g) => {
            const open = openGuide === g.id
            return (
              <div
                key={g.id}
                className="rounded-xl border-2 border-stone-200 dark:border-stone-700"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenGuide(open ? undefined : g.id)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left font-semibold"
                >
                  {g.title}
                  <span aria-hidden="true">{open ? '▴' : '▾'}</span>
                </button>
                {open && (
                  <div className="px-3 pb-3">
                    <GuideView guide={g} showStart={!inWizard} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {!inWizard && (
        <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-3 dark:border-stone-700">
          <Link
            to="/hilfe"
            onClick={onClose}
            className="inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-4 font-semibold text-white"
          >
            Alle Hilfethemen
          </Link>
          <Link
            to="/hilfe/begriffe"
            onClick={onClose}
            className="inline-flex min-h-12 items-center rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600"
          >
            Begriffe A–Z
          </Link>
        </div>
      )}
      {inWizard && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Alle Anleitungen, Begriffe A–Z und den Rundgang findest du außerhalb des Einsatzes oben
          rechts unter „?“. Deine Eingaben bleiben gespeichert.
        </p>
      )}
    </Sheet>
  )
}

/** Round "?" button that opens the help sheet. */
export function HelpButton({
  help,
  inWizard,
  onColor = false,
}: {
  help: PageHelp
  inWizard?: boolean
  onColor?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label={`Hilfe zu „${help.title}“`}
        title="Hilfe"
        onClick={() => setOpen(true)}
        className={`flex size-12 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold ${
          onColor
            ? 'border-white/60 text-white'
            : 'border-stone-300 text-brand-700 dark:border-stone-600 dark:text-brand-300'
        }`}
      >
        ?
      </button>
      {open && <HelpSheet help={help} inWizard={inWizard} onClose={() => setOpen(false)} />}
    </>
  )
}
