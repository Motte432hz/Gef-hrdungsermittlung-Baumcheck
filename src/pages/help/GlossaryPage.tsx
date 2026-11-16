import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { glossaryEntry, searchGlossary } from '../../help/glossary'

/** All technical terms A–Z with search. */
export function GlossaryPage() {
  const [query, setQuery] = useState('')
  const { hash } = useLocation()
  const entries = searchGlossary(query)

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <div className="space-y-4">
      <PageHeader title="Begriffe A–Z" back="/hilfe" backLabel="Hilfe" />
      <p className="text-stone-700 dark:text-stone-300">
        Fachbegriffe kurz erklärt. Im Einsatz sind sie gepunktet unterstrichen – antippen zeigt die
        Erklärung direkt an der Frage.
      </p>
      <label className="block">
        <span className="mb-1 block font-semibold">Begriff suchen</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="z. B. Zwiesel, PSA, Schonzeit"
          className="min-h-14 w-full rounded-xl border-2 border-stone-300 bg-white px-4 text-lg dark:border-stone-600 dark:bg-stone-800"
        />
      </label>
      {entries.length === 0 && (
        <p className="rounded-xl bg-stone-100 p-4 dark:bg-stone-800">
          Kein Begriff gefunden. Versuche ein anderes Wort.
        </p>
      )}
      <dl className="space-y-3">
        {entries.map((e) => (
          <div
            key={e.id}
            id={e.id}
            className="scroll-mt-20 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <dt className="text-lg font-bold">{e.term}</dt>
            <dd className="mt-1 leading-relaxed">{e.text}</dd>
            {e.see && (
              <dd className="mt-2 text-sm">
                Siehe auch:{' '}
                {e.see.map((id, i) => {
                  const r = glossaryEntry(id)
                  return (
                    r && (
                      <span key={id}>
                        {i > 0 && ', '}
                        <a
                          href={`#${id}`}
                          onClick={() => setQuery('')}
                          className="font-semibold text-brand-700 underline dark:text-brand-300"
                        >
                          {r.term}
                        </a>
                      </span>
                    )
                  )
                })}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  )
}
