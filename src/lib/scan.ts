/**
 * Document scan clean-up: grey scale and contrast stretch (the darkest 2 % become black,
 * the brightest 2 % white), so paper looks white and writing dark even in poor light.
 */
export function enhanceDocument(data: Uint8ClampedArray): void {
  const n = data.length / 4
  const grey = new Uint8Array(n)
  const histogram = new Uint32Array(256)
  for (let i = 0; i < n; i++) {
    const g = Math.round(0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!)
    grey[i] = g
    histogram[g]!++
  }
  const percentile = (p: number) => {
    let sum = 0
    for (let v = 0; v < 256; v++) {
      sum += histogram[v]!
      if (sum >= n * p) return v
    }
    return 255
  }
  const lo = percentile(0.02)
  const hi = Math.max(percentile(0.98), lo + 1)
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(255, ((grey[i]! - lo) * 255) / (hi - lo)))
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v
  }
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Keeps a crop rectangle inside the image and at least `min` pixels large. */
export function clampRect(r: Rect, width: number, height: number, min = 40): Rect {
  const w = Math.max(min, Math.min(r.w, width))
  const h = Math.max(min, Math.min(r.h, height))
  return {
    x: Math.max(0, Math.min(r.x, width - w)),
    y: Math.max(0, Math.min(r.y, height - h)),
    w,
    h,
  }
}

/** Default crop: 4 % margin all around. */
export const defaultCrop = (width: number, height: number): Rect => ({
  x: Math.round(width * 0.04),
  y: Math.round(height * 0.04),
  w: Math.round(width * 0.92),
  h: Math.round(height * 0.92),
})
