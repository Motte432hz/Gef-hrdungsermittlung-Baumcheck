import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { TIP_META_PREFIX } from './tips'

/** A tip that disappears for good once it has been acknowledged. */
export function OneTimeTip({ id, text }: { id: string; text: string }) {
  const key = TIP_META_PREFIX + id
  const seen = useLiveQuery(async () => !!(await db.meta.get(key)), [key])
  if (seen !== false) return null
  return (
    <aside
      aria-label="Tipp"
      className="space-y-2 rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 p-3 dark:border-sky-700 dark:bg-sky-950"
    >
      <p className="leading-relaxed">
        <span aria-hidden="true">💡 </span>
        <span className="font-bold">Tipp: </span>
        {text}
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void db.meta.put({ key, value: new Date().toISOString() })}
          className="min-h-11 rounded-xl border-2 border-sky-400 px-4 font-semibold dark:border-sky-700"
        >
          Verstanden
        </button>
      </div>
    </aside>
  )
}
