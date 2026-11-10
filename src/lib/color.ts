/** Small colour helpers for brand palettes (no dependencies, unit-tested). */

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === rn
      ? (gn - bn) / d + (gn < bn ? 6 : 0)
      : max === gn
        ? (bn - rn) / d + 2
        : (rn - gn) / d + 4
  return [h * 60, s, l]
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** WCAG contrast ratio between two colours (1 … 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a))
  const lb = luminance(hexToRgb(b))
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export const PALETTE_STEPS = [50, 100, 300, 500, 700, 900] as const
export type Palette = Record<(typeof PALETTE_STEPS)[number], string>

/**
 * Palette from one brand colour. 700 is the main colour for buttons and gets white text,
 * so it is darkened until the contrast to white is at least 4.5:1 (readable outdoors).
 */
export function makePalette(hex: string): Palette {
  const [h, s0] = rgbToHsl(hexToRgb(hex))
  // Grey logos keep a little saturation-free neutral palette.
  const s = Math.min(s0, 0.85)
  const at = (l: number, sat = s) => rgbToHex(hslToRgb(h, sat, l))
  let l700 = Math.min(rgbToHsl(hexToRgb(hex))[2], 0.45)
  while (contrast(at(l700), '#ffffff') < 4.5 && l700 > 0.05) l700 -= 0.01
  return {
    50: at(0.96, s * 0.6),
    100: at(0.9, s * 0.7),
    300: at(0.68),
    500: at(Math.min(l700 + 0.12, 0.55)),
    700: at(l700),
    900: at(Math.max(l700 - 0.15, 0.08)),
  }
}

/** Distance in RGB space – used to drop near-duplicate suggestions. */
export function distance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

/**
 * Most characteristic colours of an image (RGBA pixel data): transparent, near-white and
 * near-black pixels are ignored, saturated colours are preferred.
 */
export function dominantColors(rgba: Uint8ClampedArray, max = 4): string[] {
  const buckets = new Map<string, { n: number; r: number; g: number; b: number; s: number }>()
  for (let i = 0; i < rgba.length; i += 4) {
    const [r, g, b, a] = [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!, rgba[i + 3]!]
    if (a < 128) continue
    const [, s, l] = rgbToHsl([r, g, b])
    if (l > 0.93 || l < 0.07) continue
    const key = `${r >> 5},${g >> 5},${b >> 5}`
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, s }
    e.n++
    e.r += r
    e.g += g
    e.b += b
    buckets.set(key, e)
  }
  const ranked = [...buckets.values()]
    .map((e) => ({ hex: rgbToHex([e.r / e.n, e.g / e.n, e.b / e.n]), score: e.n * (0.3 + e.s) }))
    .sort((a, b) => b.score - a.score)
  const out: string[] = []
  for (const c of ranked) {
    if (out.every((o) => distance(o, c.hex) > 60)) out.push(c.hex)
    if (out.length >= max) break
  }
  return out
}
