import { describe, expect, it } from 'vitest'
import { clampRect, defaultCrop, enhanceDocument } from './scan'

describe('document scan', () => {
  it('stretches grey paper to white and grey ink to black', () => {
    // 50 pixels of grey "paper" (180) and 50 of grey "ink" (90), coloured slightly.
    const px = new Uint8ClampedArray(100 * 4)
    for (let i = 0; i < 100; i++) {
      const v = i < 50 ? 180 : 90
      px.set([v + 10, v, v - 10, 255], i * 4)
    }
    enhanceDocument(px)
    expect([px[0], px[1], px[2], px[3]]).toEqual([255, 255, 255, 255])
    expect([px[99 * 4], px[99 * 4 + 1]]).toEqual([0, 0])
  })

  it('keeps the crop inside the picture', () => {
    expect(clampRect({ x: -10, y: 500, w: 2000, h: 100 }, 800, 600)).toEqual({
      x: 0,
      y: 500,
      w: 800,
      h: 100,
    })
    expect(clampRect({ x: 790, y: 0, w: 5, h: 5 }, 800, 600)).toEqual({
      x: 760,
      y: 0,
      w: 40,
      h: 40,
    })
    expect(defaultCrop(1000, 500)).toEqual({ x: 40, y: 20, w: 920, h: 460 })
  })
})
