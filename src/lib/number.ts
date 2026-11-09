/** Parses German or English decimal input ("12,5" or "12.5"). */
export function parseDecimal(v: string): number | null {
  const s = v.trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}
