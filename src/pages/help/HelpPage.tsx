import { Link } from 'react-router'
import { PageTitle } from '../../components/Card'
import { LinkList, ListLink } from '../../components/ListLink'
import { getGuide, guideGroups } from '../../help/guides'
import { resetTips } from '../../help/tips'
import { useState } from 'react'

/** Help centre: guides, glossary and the tour. */
export function HelpPage() {
  return (
    <div className="space-y-5">
      <PageTitle>Hilfe</PageTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/hilfe/rundgang"
          className="flex min-h-20 items-center gap-3 rounded-2xl bg-brand-700 p-4 font-semibold text-white"
        >
          <span aria-hidden="true" className="text-3xl">
            🧭
          </span>
          <span>
            <span className="block text-lg">Rundgang starten</span>
            <span className="block text-sm font-normal text-white/85">
              Die App in 8 kurzen Bildern
            </span>
          </span>
        </Link>
        <Link
          to="/hilfe/begriffe"
          className="flex min-h-20 items-center gap-3 rounded-2xl border-2 border-stone-300 bg-white p-4 font-semibold dark:border-stone-700 dark:bg-stone-900"
        >
          <span aria-hidden="true" className="text-3xl">
            📖
          </span>
          <span>
            <span className="block text-lg">Begriffe A–Z</span>
            <span className="block text-sm font-normal text-stone-600 dark:text-stone-400">
              Fachbegriffe kurz erklärt
            </span>
          </span>
        </Link>
      </div>

      <p className="text-stone-700 dark:text-stone-300">
        Tipp: Das „?“ oben rechts zeigt Hilfe zu der Seite, auf der du gerade bist – auch im
        Einsatz.
      </p>

      <TipsReset />

      <h2 className="text-xl font-bold">Wie mache ich …?</h2>
      {guideGroups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h3 className="font-semibold text-stone-600 dark:text-stone-400">{group.title}</h3>
          <LinkList>
            {group.title === 'Einrichten' && (
              <ListLink
                to="/einrichtung"
                title="Einrichtungs-Assistent"
                meta="Firma, Team, Ausrüstung und Datensicherung Schritt für Schritt"
              />
            )}
            {group.guides.map((id) => {
              const g = getGuide(id)
              return (
                g && (
                  <ListLink
                    key={id}
                    to={`/hilfe/anleitung/${id}`}
                    title={g.title}
                    meta={g.summary}
                  />
                )
              )
            })}
          </LinkList>
        </section>
      ))}
    </div>
  )
}

function TipsReset() {
  const [done, setDone] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void resetTips().then(() => setDone(true))}
        className="min-h-12 rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600"
      >
        💡 Tipps wieder anzeigen
      </button>
      <span role="status" className="font-semibold text-brand-700 dark:text-brand-300">
        {done ? '✓ Die Tipps erscheinen wieder im Einsatz.' : ''}
      </span>
    </div>
  )
}
