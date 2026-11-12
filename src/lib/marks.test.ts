import { describe, expect, it } from 'vitest'
import { arrowHead, isVisible, lineWidth, toImage } from './marks'

describe('photo marks', () => {
  it('maps screen to image pixels', () => {
    const p = toImage(
      150,
      100,
      { left: 50, top: 0, width: 400, height: 300 },
      { width: 1600, height: 1200 },
    )
    expect(p).toEqual({ x: 400, y: 400 })
  })

  it('arrow head points back from the tip', () => {
    const [a, b] = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, 20)
    expect(a.x).toBeLessThan(100)
    expect(b.x).toBeLessThan(100)
    expect(a.y).toBeCloseTo(-b.y)
  })

  it('ignores taps and scales the line with the photo', () => {
    expect(isVisible({ kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 2, y: 2 } })).toBe(false)
    expect(isVisible({ kind: 'free', points: [{ x: 0, y: 0 }] })).toBe(false)
    expect([lineWidth(400), lineWidth(1600)]).toEqual([4, 10])
  })
})
