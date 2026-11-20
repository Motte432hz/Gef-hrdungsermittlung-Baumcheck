import { useRef, type TouchEvent } from 'react'

/** Elements where a horizontal finger movement means something else (drawing, maps, scrolling). */
const NO_SWIPE =
  'canvas, input, textarea, select, [role="slider"], .leaflet-container, .overflow-x-auto, [data-no-swipe]'

/** Minimum distance and how clearly horizontal the movement has to be. */
export const SWIPE_MIN_PX = 80

export function isSwipe(dx: number, dy: number): -1 | 1 | 0 {
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < 2 * Math.abs(dy)) return 0
  // Finger to the left = next step.
  return dx < 0 ? 1 : -1
}

/** Swiping left/right goes to the next/previous step. */
export function useSwipe(onSwipe: (direction: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: TouchEvent) => {
      const target = e.target as Element
      const t = e.touches[0]
      start.current =
        e.touches.length === 1 && t && !target.closest(NO_SWIPE)
          ? { x: t.clientX, y: t.clientY }
          : null
    },
    onTouchEnd: (e: TouchEvent) => {
      const s = start.current
      const t = e.changedTouches[0]
      start.current = null
      if (!s || !t) return
      // Selecting text is not a swipe.
      if (window.getSelection()?.toString()) return
      const dir = isSwipe(t.clientX - s.x, t.clientY - s.y)
      if (dir) onSwipe(dir)
    },
  }
}
