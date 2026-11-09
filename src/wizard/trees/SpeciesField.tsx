import { useId, useState } from 'react'
import type { SpecialItem } from '../../form/schema'
import { getSpecies, OTHER_SPECIES, searchSpecies, type TreeSpecies } from '../../form/species'
import { useWizard } from '../WizardContext'
import { ItemCard } from '../inputs/ItemCard'
import { ItemLabel } from '../inputs/InfoButton'
import { SpeciesHazards } from './SpeciesHazards'

function SpeciesBadges({ s }: { s: TreeSpecies }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1 text-xs font-semibold">
      <span className="rounded-md bg-stone-200 px-1.5 py-0.5 dark:bg-stone-700">
        {s.group === 'nadel' ? 'Nadelbaum' : 'Laubbaum'}
      </span>
      <span
        className={`rounded-md px-1.5 py-0.5 ${s.native ? 'bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-brand-100' : 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100'}`}
      >
        {s.native ? 'heimisch' : 'nicht heimisch'}
      </span>
      {s.hazards.length > 0 && (
        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-amber-950 dark:bg-amber-900 dark:text-amber-50">
          {s.hazards.length} typische {s.hazards.length === 1 ? 'Gefahr' : 'Gefahren'}
        </span>
      )}
    </span>
  )
}

export function SpeciesField({ item, treeId }: { item: SpecialItem; treeId: string }) {
  const { trees, setAnswer } = useWizard()
  const tree = trees.find((t) => t.id === treeId)
  const answer = tree?.answers[item.id]
  const selected = getSpecies(typeof answer?.value === 'string' ? answer.value : undefined)
  const isOther = answer?.value === OTHER_SPECIES
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(!answer)
  const inputId = useId()
  const listId = useId()
  const results = searchSpecies(query, 15)

  const choose = (s: TreeSpecies) => {
    void setAnswer(item.id, { value: s.id }, treeId)
    setQuery('')
    setEditing(false)
  }
  const chooseOther = () => {
    void setAnswer(item.id, { value: OTHER_SPECIES, otherText: query.trim() }, treeId)
    setQuery('')
    setEditing(false)
  }

  return (
    <div className="space-y-3">
      <ItemCard>
        <ItemLabel
          as="label"
          htmlFor={inputId}
          label={item.label}
          info="Deutschen oder lateinischen Namen eingeben, z. B. „Bergahorn“ oder „Acer“. Nicht gefunden? Den Namen als andere Baumart übernehmen."
          required={item.required}
        />
        {!editing && (selected || isOther) ? (
          <div className="flex items-start justify-between gap-2 rounded-xl bg-stone-100 p-3 dark:bg-stone-800">
            <div>
              <p className="text-lg font-semibold">{selected ? selected.de : answer?.otherText}</p>
              {selected ? (
                <>
                  <p className="italic text-stone-700 dark:text-stone-300">{selected.la}</p>
                  <SpeciesBadges s={selected} />
                </>
              ) : (
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Andere Baumart (nicht in der Liste)
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-12 shrink-0 rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600"
            >
              Ändern
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              id={inputId}
              type="search"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              autoComplete="off"
              placeholder="z. B. Bergahorn, Linde, Quercus …"
              className="block min-h-14 w-full rounded-xl border-2 border-stone-300 bg-white px-3 text-lg dark:border-stone-600 dark:bg-stone-800"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim() && (
              <ul id={listId} role="listbox" aria-label="Baumarten" className="space-y-1">
                {results.map((s) => (
                  <li key={s.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => choose(s)}
                      className="block min-h-14 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-left hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                    >
                      <span className="block font-semibold">{s.de}</span>
                      <span className="block text-sm italic text-stone-600 dark:text-stone-400">
                        {s.la}
                      </span>
                    </button>
                  </li>
                ))}
                <li role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={chooseOther}
                    className="block min-h-14 w-full rounded-xl border-2 border-dashed border-stone-300 px-3 py-2 text-left dark:border-stone-600"
                  >
                    „{query.trim()}“ als andere Baumart übernehmen
                  </button>
                </li>
              </ul>
            )}
            {(selected || isOther) && (
              <button
                type="button"
                className="min-h-12 font-semibold text-brand-700 underline dark:text-brand-300"
                onClick={() => setEditing(false)}
              >
                Abbrechen
              </button>
            )}
          </div>
        )}
      </ItemCard>
      {selected && !editing && <SpeciesHazards species={selected} />}
    </div>
  )
}
