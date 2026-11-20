import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Answer, Answers } from '../../domain/types'
import type { FormStep } from '../../form/schema'
import { GATE_NONE, GATE_SOME } from '../../form/schema'
import type { makeLookup } from '../../form/validation'
import { useWizard } from '../WizardContext'
import { ItemLabel } from '../inputs/InfoButton'
import { BufferedText } from '../inputs/BufferedText'
import { orderedMeasures } from '../inputs/measures'
import { isOpenCard, nextOpenCard, quickCards, type QuickCard } from './quickCards'

type Lookup = ReturnType<typeof makeLookup>

const bigButton =
  'flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl border-4 px-4 text-2xl font-bold'
const tone = {
  good: 'border-brand-700 bg-brand-700 text-white',
  bad: 'border-red-700 bg-red-700 text-white',
  muted:
    'border-stone-300 bg-white text-stone-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100',
}
/** The current answer is outlined so it is clear what was chosen before. */
const chosen = 'ring-4 ring-accent-500 ring-offset-2 dark:ring-offset-stone-950'

/**
 * Quick mode: one yes/no question at a time with very large buttons, made for gloves.
 * A positive answer goes straight on; "Nein"/"vorhanden" asks for the measure first.
 */
export function QuickMode({
  step,
  answers,
  lookup,
  treeId,
  title,
  onClose,
}: {
  step: FormStep
  answers: Answers
  lookup: Lookup
  treeId?: string
  /** E.g. "Baum 2 · Winter-Linde". */
  title?: string
  onClose: () => void
}) {
  const { setAnswers, definition, measureStats } = useWizard()
  const cards = quickCards(step, answers, lookup)
  const [currentId, setCurrentId] = useState(() => nextOpenCard(cards, answers)?.id)
  const [history, setHistory] = useState<string[]>([])
  const [done, setDone] = useState(currentId === undefined)
  const card = cards.find((c) => c.id === currentId)
  const total = cards.length
  const openCount = cards.filter((c) => isOpenCard(c, answers)).length

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  /** Saves and moves on; the next card is found with the answers as they will be. */
  const write = async (changes: Record<string, Answer | undefined>, advance: boolean) => {
    await setAnswers(changes, treeId)
    if (!advance || !card) return
    const next: Answers = { ...answers }
    for (const [id, a] of Object.entries(changes)) {
      if (a === undefined) delete next[id]
      else next[id] = a
    }
    const after = nextOpenCard(quickCards(step, next, lookup), next, card.id)
    setHistory((h) => [...h, card.id])
    if (after) setCurrentId(after.id)
    else setDone(true)
  }

  const back = () => {
    const prev = history.at(-1)
    if (!prev) return
    setHistory((h) => h.slice(0, -1))
    setCurrentId(prev)
    setDone(false)
  }

  const position = card ? cards.indexOf(card) + 1 : total

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Schnellmodus"
      className="pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100"
    >
      <div className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-stone-600 dark:text-stone-400">
              ⚡ Schnellmodus · {step.title}
              {title ? ` · ${title}` : ''}
            </p>
            <p className="font-semibold">
              {done ? 'Fertig' : `Frage ${position} von ${total}`}
              {!done && ` · noch ${openCount} offen`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600"
          >
            Beenden
          </button>
        </div>
        <div className="h-1.5 bg-stone-200 dark:bg-stone-800">
          <div
            className="h-1.5 bg-accent-500 transition-all"
            style={{ width: `${total ? ((total - openCount) / total) * 100 : 100}%` }}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto p-4">
        {done || !card ? (
          <DoneView onClose={onClose} />
        ) : (
          <CardView
            key={card.id}
            card={card}
            answers={answers}
            noteLabels={definition.noteLabels}
            suggestions={(c) =>
              c.kind === 'gate'
                ? []
                : orderedMeasures(c.item.measures, measureStats?.get(c.item.id))
            }
            onWrite={write}
          />
        )}
      </div>

      {!done && (
        <div className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <div className="mx-auto flex max-w-2xl gap-3 p-3">
            <button
              type="button"
              onClick={back}
              disabled={history.length === 0}
              className="min-h-14 flex-1 rounded-xl border-2 border-stone-300 font-semibold disabled:opacity-40 dark:border-stone-600"
            >
              ‹ Vorherige
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

function DoneView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <p aria-hidden="true" className="text-6xl">
        ✅
      </p>
      <h2 className="text-2xl font-bold">Alle Ja/Nein-Fragen erledigt</h2>
      <p className="text-lg text-stone-700 dark:text-stone-300">
        Weitere Angaben (z. B. Auswahlfelder oder Texte) stehen im Formular.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="min-h-14 w-full max-w-sm rounded-xl bg-brand-700 text-lg font-semibold text-white"
      >
        Zurück zum Formular
      </button>
    </div>
  )
}

function CardView({
  card,
  answers,
  noteLabels,
  suggestions,
  onWrite,
}: {
  card: QuickCard
  answers: Answers
  noteLabels: { checkpoint: string; hazard: string }
  suggestions: (c: QuickCard) => string[]
  onWrite: (changes: Record<string, Answer | undefined>, advance: boolean) => Promise<void>
}) {
  const answer = answers[card.id]
  const value = answer?.value
  // A finding asks for the measure on the same card.
  const [measure, setMeasure] = useState(
    () => (value === 'no' || value === 'present') && !answer?.prefilled,
  )
  const [note, setNote] = useState(answer?.note ?? '')
  const measureRef = useRef<HTMLDivElement>(null)
  const showMeasure = measure && card.kind !== 'gate' && (value === 'no' || value === 'present')
  // The measure field comes into view by itself after "Nein"/"Vorhanden".
  useEffect(() => {
    if (showMeasure) measureRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [showMeasure])
  const help = card.kind === 'gate' ? card.gate : card.item

  const answerWith = (v: string, finding: boolean) => {
    if (finding) {
      setMeasure(true)
      void onWrite({ [card.id]: { value: v, ...(note.trim() ? { note } : {}) } }, false)
    } else void onWrite({ [card.id]: { value: v } }, true)
  }

  const gate = (v: typeof GATE_NONE | typeof GATE_SOME) => {
    if (card.kind !== 'gate') return
    if (v === GATE_SOME) return void onWrite({ [card.id]: { value: v } }, true)
    const present = card.hazards.filter((h) => answers[h.id]?.value === 'present')
    if (
      present.length > 0 &&
      !window.confirm(
        `${present.length} ${present.length === 1 ? 'Merkmal ist' : 'Merkmale sind'} als „vorhanden“ eingetragen. Wirklich alles als unauffällig markieren? Die Angaben werden gelöscht.`,
      )
    )
      return
    // "No abnormalities" replaces the individual answers, as in the form.
    const changes: Record<string, Answer | undefined> = { [card.id]: { value: v } }
    for (const h of card.hazards) changes[h.id] = undefined
    void onWrite(changes, true)
  }

  return (
    <>
      {card.section.title && (
        <p className="text-sm font-semibold tracking-wide text-stone-600 uppercase dark:text-stone-400">
          {card.section.title}
        </p>
      )}
      <div className="text-xl [&_p]:text-xl">
        <ItemLabel label={help.label} info={help.info} why={help.why} example={help.example} />
      </div>
      {answer?.prefilled && (
        <p className="rounded-xl bg-sky-100 p-3 font-semibold text-sky-950 dark:bg-sky-900 dark:text-sky-50">
          Vorbelegt mit „
          {value === 'yes' ? 'Ja' : value === 'na' ? 'nicht relevant' : String(value)}“ – bitte vor
          Ort prüfen und bestätigen.
        </p>
      )}

      {card.kind === 'gate' ? (
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => gate(GATE_NONE)}
            className={`${bigButton} ${tone.good} ${value === GATE_NONE ? chosen : ''}`}
          >
            ✓ Nein, unauffällig
          </button>
          <button
            type="button"
            onClick={() => gate(GATE_SOME)}
            className={`${bigButton} ${tone.bad} ${value === GATE_SOME ? chosen : ''}`}
          >
            ! Ja, einzeln prüfen
          </button>
        </div>
      ) : card.kind === 'checkpoint' ? (
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => answerWith('yes', false)}
            className={`${bigButton} ${tone.good} ${value === 'yes' ? chosen : ''}`}
          >
            ✓ Ja
          </button>
          <button
            type="button"
            onClick={() => answerWith('no', true)}
            className={`${bigButton} ${tone.bad} ${value === 'no' ? chosen : ''}`}
          >
            ✗ Nein
          </button>
          {card.item.allowNotRelevant !== false && (
            <button
              type="button"
              onClick={() => answerWith('na', false)}
              className={`${bigButton} min-h-16 text-xl ${tone.muted} ${value === 'na' ? chosen : ''}`}
            >
              nicht relevant
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => answerWith('absent', false)}
            className={`${bigButton} ${tone.good} ${value === 'absent' ? chosen : ''}`}
          >
            ✓ Nicht vorhanden
          </button>
          <button
            type="button"
            onClick={() => answerWith('present', true)}
            className={`${bigButton} ${tone.bad} ${value === 'present' ? chosen : ''}`}
          >
            ! Vorhanden
          </button>
        </div>
      )}

      {showMeasure && (
        <div
          ref={measureRef}
          className="space-y-3 rounded-2xl border-2 border-red-700 bg-white p-4 dark:bg-stone-900"
        >
          <BufferedText
            multiline
            required
            label={card.kind === 'checkpoint' ? noteLabels.checkpoint : noteLabels.hazard}
            initial={note}
            onSave={(n) => {
              setNote(n)
              void onWrite({ [card.id]: { value: String(value), note: n } }, false)
            }}
            suggestions={suggestions(card)}
          />
          <button
            type="button"
            disabled={!note.trim()}
            onClick={() => void onWrite({ [card.id]: { value: String(value), note } }, true)}
            className="min-h-14 w-full rounded-xl bg-brand-700 text-lg font-semibold text-white disabled:bg-stone-300 disabled:text-stone-600"
          >
            Weiter ›
          </button>
        </div>
      )}
    </>
  )
}
