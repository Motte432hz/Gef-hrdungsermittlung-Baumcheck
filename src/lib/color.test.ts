import { describe, expect, it } from 'vitest'
import { contrast, dominantColors, hexToRgb, makePalette, rgbToHex } from './color'

describe('colour helpers', () => {
  it('hex round trip', () => {
    expect(rgbToHex(hexToRgb('#1f5130'))).toBe('#1f5130')
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
  })

  it('contrast ratio', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })

  it.each(['#ffd400', '#7fd1ff', '#e30613', '#1f5130', '#888888', '#00ff00'])(
    'palette from %s keeps white text readable on 700',
    (hex) => {
      const p = makePalette(hex)
      expect(contrast(p[700], '#ffffff')).toBeGreaterThanOrEqual(4.5)
      // Light steps stay light.
      expect(contrast(p[50], '#000000')).toBeGreaterThan(15)
    },
  )

  it('dominant colours ignore transparent, white and black pixels', () => {
    const px = (r: number, g: number, b: number, a = 255) => [r, g, b, a]
    const data = new Uint8ClampedArray([
      ...Array(50)
        .fill(px(255, 255, 255))
        .flat(), // white background
      ...Array(30)
        .fill(px(0, 0, 0))
        .flat(), // black text
      ...Array(40)
        .fill(px(0, 0, 0, 0))
        .flat(), // transparent
      ...Array(20)
        .fill(px(200, 30, 30))
        .flat(), // red
      ...Array(10)
        .fill(px(30, 120, 60))
        .flat(), // green
    ])
    const colors = dominantColors(data)
    expect(colors).toHaveLength(2)
    expect(hexToRgb(colors[0]!)[0]).toBeGreaterThan(150) // red first
    expect(hexToRgb(colors[1]!)[1]).toBeGreaterThan(100) // then green
  })
})
