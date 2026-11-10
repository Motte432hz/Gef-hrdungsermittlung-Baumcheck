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

describe('dominantColors with anti-aliasing', () => {
  it('ignores edge mixtures of a colour with the background', () => {
    const px = (r: number, g: number, b: number) => [r, g, b, 255]
    const data = new Uint8ClampedArray([
      ...Array(400)
        .fill(px(21, 101, 192))
        .flat(), // blue
      ...Array(250)
        .fill(px(242, 169, 0))
        .flat(), // yellow
      ...Array(40)
        .fill(px(140, 180, 225))
        .flat(), // light blue edge (blue + white)
      ...Array(300)
        .fill(px(255, 255, 255))
        .flat(),
    ])
    const colors = dominantColors(data)
    expect(colors).toHaveLength(2)
    expect(hexToRgb(colors[0]!)[2]).toBeGreaterThan(150) // blue
    expect(hexToRgb(colors[1]!)[0]).toBeGreaterThan(200) // yellow
  })
})

describe('harmonies', () => {
  it('returns distinct suggestions different from the main colour', async () => {
    const { harmonies, distance } = await import('./color')
    const h = harmonies('#1f5130')
    expect(h.map((x) => x.label)).toEqual(['Ähnlich', 'Kontrast', 'Ton in Ton', 'Warmes Gold'])
    for (const x of h) {
      expect(x.hex).toMatch(/^#[0-9a-f]{6}$/)
      expect(distance(x.hex, '#1f5130')).toBeGreaterThan(30)
    }
  })
})
