import { GlossaryText } from '../help/GlossaryText'

/** One or two sentences at the top of a step: what it is about. */
export function StepIntro({ text }: { text: string }) {
  return (
    <p className="rounded-xl border-l-4 border-brand-700 bg-stone-100 px-4 py-3 text-stone-800 dark:border-brand-300 dark:bg-stone-800 dark:text-stone-200">
      <GlossaryText text={text} />
    </p>
  )
}
