import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { META_SETUP_DISMISSED, useSetupStatus } from '../../help/setup'
import { META_WELCOME_DISMISSED, usePracticeStart } from '../../help/practice'
import { Card } from '../../components/Card'

/**
 * Welcome for a new installation (above the start button), otherwise the setup checklist
 * until everything is done (below it, so starting a job is never pushed off the screen).
 */
export function SetupCards({ place }: { place: 'welcome' | 'checklist' }) {
  const status = useSetupStatus()
  const welcomeDismissed = useLiveQuery(
    async () => !!(await db.meta.get(META_WELCOME_DISMISSED)),
    [],
  )
  if (!status || welcomeDismissed === undefined || status.member) return null
  const welcome = status.fresh && !welcomeDismissed
  if (place === 'welcome') return welcome ? <WelcomeCard /> : null
  if (welcome || status.dismissed || status.done === status.items.length) return null
  return <SetupChecklist />
}

const choice =
  'flex min-h-20 w-full items-center gap-3 rounded-2xl border-2 p-4 text-left font-semibold'

function WelcomeCard() {
  const practice = usePracticeStart()
  return (
    <section
      aria-labelledby="welcome-title"
      className="space-y-3 rounded-2xl border-2 border-brand-700 bg-white p-4 dark:border-brand-300 dark:bg-stone-900"
    >
      <h2 id="welcome-title" className="text-xl font-bold">
        Willkommen! Wie möchtest du starten?
      </h2>
      <Link to="/einrichtung" className={`${choice} border-brand-700 bg-brand-700 text-white`}>
        <span aria-hidden="true" className="text-3xl">
          🏢
        </span>
        <span>
          <span className="block text-lg">Ich richte meine Firma ein</span>
          <span className="block text-sm font-normal text-white/85">
            Firma, Team und Ausrüstung – in etwa 5 Minuten
          </span>
        </span>
      </Link>
      <Link
        to="/profile/firma/cloud"
        className={`${choice} border-stone-300 dark:border-stone-600`}
      >
        <span aria-hidden="true" className="text-3xl">
          ✉️
        </span>
        <span>
          <span className="block text-lg">Ich wurde eingeladen</span>
          <span className="block text-sm font-normal text-stone-600 dark:text-stone-400">
            Mit dem Einladungs-Code der Firma beitreten
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void practice.start()}
        disabled={practice.busy}
        className={`${choice} border-stone-300 dark:border-stone-600`}
      >
        <span aria-hidden="true" className="text-3xl">
          🎓
        </span>
        <span>
          <span className="block text-lg">Erst einmal ausprobieren</span>
          <span className="block text-sm font-normal text-stone-600 dark:text-stone-400">
            Übungseinsatz – ohne Nummer, kommt nicht ins Archiv
          </span>
        </span>
      </button>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to="/hilfe/rundgang"
          className="inline-flex min-h-12 items-center rounded-xl px-3 font-semibold text-brand-700 underline dark:text-brand-300"
        >
          Rundgang ansehen
        </Link>
        <button
          type="button"
          onClick={() => void db.meta.put({ key: META_WELCOME_DISMISSED, value: true })}
          className="inline-flex min-h-12 items-center rounded-xl px-3 font-semibold text-stone-600 underline dark:text-stone-400"
        >
          Später
        </button>
      </div>
    </section>
  )
}

function SetupChecklist() {
  const status = useSetupStatus()
  const [open, setOpen] = useState(true)
  if (!status) return null
  const { items, done } = status
  return (
    <Card>
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-lg font-bold">
          Einrichtung · {done} von {items.length} erledigt
        </h2>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="min-h-12 rounded-xl px-3 font-semibold text-brand-700 dark:text-brand-300"
        >
          {open ? 'Weniger' : 'Anzeigen'}
        </button>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
        role="progressbar"
        aria-label="Fortschritt der Einrichtung"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={done}
      >
        <div className="h-2 bg-brand-700" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      {open && (
        <>
          <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
            {items.map((item) => (
              <li key={item.id}>
                {item.done ? (
                  <p className="flex min-h-14 items-center gap-3 text-stone-500 dark:text-stone-400">
                    <span aria-hidden="true" className="text-xl text-brand-700 dark:text-brand-300">
                      ✓
                    </span>
                    <span className="line-through">{item.title}</span>
                    <span className="sr-only">(erledigt)</span>
                  </p>
                ) : (
                  <Link to={item.to} className="flex min-h-14 items-center gap-3 py-2">
                    <span
                      aria-hidden="true"
                      className="size-5 shrink-0 rounded-full border-2 border-stone-400"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{item.title}</span>
                      <span className="block text-sm text-stone-600 dark:text-stone-400">
                        {item.hint}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-2xl text-stone-400">
                      ›
                    </span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void db.meta.put({ key: META_SETUP_DISMISSED, value: true })}
            className="mt-2 min-h-12 font-semibold text-stone-600 underline dark:text-stone-400"
          >
            Checkliste ausblenden
          </button>
        </>
      )}
    </Card>
  )
}
