/** Marks an element as "still to answer" for scrollToNextOpen. */
export const OPEN_ATTR = 'data-open'

/**
 * After an answer, brings the next unanswered item of the step into view – unless it is
 * already comfortably visible. Waits briefly so the answered item can collapse first.
 */
export function scrollToNextOpen(fromId: string, delay = 150) {
  window.setTimeout(() => {
    const from = document.getElementById(fromId)
    if (!from) return
    const next = [...document.querySelectorAll<HTMLElement>(`[${OPEN_ATTR}]`)].find(
      (el) => el !== from && from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
    )
    if (!next) return
    const r = next.getBoundingClientRect()
    if (r.top > 140 && r.bottom < window.innerHeight - 110) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    next.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, delay)
}
