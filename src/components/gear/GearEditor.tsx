import { useId, useState } from 'react'
import type { GearItem } from '../../domain/types'
import {
  GEAR_CATEGORIES,
  searchGear,
  type GearCatalogItem,
  type GearCategory,
} from '../../form/equipmentCatalog'
import { newId, todayLocal } from '../../db/repo'
import { TextField } from '../form/Field'
import { Button } from '../Button'

const categoryLabel = (c: string) => GEAR_CATEGORIES[c as GearCategory] ?? GEAR_CATEGORIES.other

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** Editable list of a person's PPE/gear with instant catalogue search and free entry. */
export function GearEditor({
  value,
  onChange,
}: {
  value: GearItem[]
  onChange: (gear: GearItem[]) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string>()
  const inputId = useId()
  const listId = useId()
  const results = searchGear(query, 8)
  const today = todayLocal()

  const add = (item: Omit<GearItem, 'id'>) => {
    const g = { ...item, id: newId() }
    onChange([...value, g])
    setQuery('')
    setOpen(g.id)
  }
  const fromCatalog = (c: GearCatalogItem) =>
    add({ name: c.name, category: c.category, catalogId: c.id })
  const update = (id: string, changes: Partial<GearItem>) =>
    onChange(value.map((g) => (g.id === id ? { ...g, ...changes } : g)))
  const remove = (id: string) => onChange(value.filter((g) => g.id !== id))

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="space-y-2" aria-label="Ausrüstung">
          {value.map((g) => {
            const overdue = g.nextInspection && g.nextInspection < today
            return (
              <li key={g.id} className="rounded-xl border-2 border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  aria-expanded={open === g.id}
                  onClick={() => setOpen(open === g.id ? undefined : g.id)}
                  className="flex min-h-14 w-full items-center justify-between gap-2 px-3 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{g.name}</span>
                    <span className="block text-sm text-stone-600 dark:text-stone-400">
                      {[
                        categoryLabel(g.category),
                        g.serialNumber && `Nr. ${g.serialNumber}`,
                        g.nextInspection && `Prüfung bis ${fmtDate(g.nextInspection)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {overdue && (
                      <span className="block text-sm font-semibold text-red-700 dark:text-red-400">
                        Prüfung überfällig
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-stone-400">
                    {open === g.id ? '▴' : '▾'}
                  </span>
                </button>
                {open === g.id && (
                  <div className="space-y-3 border-t border-stone-200 p-3 dark:border-stone-700">
                    <TextField
                      label="Bezeichnung"
                      value={g.name}
                      onChange={(e) => update(g.id, { name: e.target.value })}
                    />
                    <div className="space-y-1">
                      <label htmlFor={`${g.id}-cat`} className="block font-semibold">
                        Art
                      </label>
                      <select
                        id={`${g.id}-cat`}
                        value={g.category}
                        onChange={(e) => update(g.id, { category: e.target.value })}
                        className="block min-h-12 w-full rounded-xl border-2 border-stone-300 bg-white px-3 dark:border-stone-600 dark:bg-stone-800"
                      >
                        {Object.entries(GEAR_CATEGORIES).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <TextField
                      label="Seriennummer (optional)"
                      value={g.serialNumber ?? ''}
                      onChange={(e) => update(g.id, { serialNumber: e.target.value || undefined })}
                    />
                    <TextField
                      label="Nächste Prüfung (optional)"
                      hint="Z. B. jährliche Prüfung der PSA gegen Absturz durch eine sachkundige Person."
                      type="date"
                      value={g.nextInspection ?? ''}
                      onChange={(e) =>
                        update(g.id, { nextInspection: e.target.value || undefined })
                      }
                    />
                    <TextField
                      label="Notiz (optional)"
                      value={g.note ?? ''}
                      onChange={(e) => update(g.id, { note: e.target.value || undefined })}
                    />
                    <Button
                      variant="secondary"
                      className="text-red-700 dark:text-red-400"
                      onClick={() => remove(g.id)}
                    >
                      Entfernen
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="space-y-2">
        <label htmlFor={inputId} className="block font-semibold">
          Ausrüstung hinzufügen
        </label>
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={query.trim().length > 0}
          aria-controls={listId}
          autoComplete="off"
          placeholder="z. B. SpiderJack, Sequoia, Helm, MS 201 …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block min-h-14 w-full rounded-xl border-2 border-stone-300 bg-white px-3 text-lg dark:border-stone-600 dark:bg-stone-800"
        />
        {query.trim() && (
          <ul id={listId} role="listbox" aria-label="Vorschläge" className="space-y-1">
            {results.map((c) => (
              <li key={c.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => fromCatalog(c)}
                  className="block min-h-14 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-left hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                >
                  <span className="block font-semibold">{c.name}</span>
                  <span className="block text-sm text-stone-600 dark:text-stone-400">
                    {categoryLabel(c.category)}
                  </span>
                </button>
              </li>
            ))}
            <li role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => add({ name: query.trim(), category: 'other' })}
                className="block min-h-14 w-full rounded-xl border-2 border-dashed border-stone-300 px-3 py-2 text-left dark:border-stone-600"
              >
                „{query.trim()}“ als eigene Ausrüstung übernehmen
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}
