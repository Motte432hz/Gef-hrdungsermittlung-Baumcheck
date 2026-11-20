// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isSwipe } from './useSwipe'

describe('swipe', () => {
  it('a clear horizontal movement changes the step', () => {
    expect(isSwipe(-120, 10)).toBe(1) // finger to the left: next
    expect(isSwipe(120, -20)).toBe(-1)
  })
  it('short or diagonal movements (scrolling) are ignored', () => {
    expect(isSwipe(-50, 0)).toBe(0)
    expect(isSwipe(-120, 90)).toBe(0)
  })
})
