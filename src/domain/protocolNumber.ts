/**
 * Protocol numbers: <PREFIX>-<YEAR>-<SEQ>, e.g. ZW-2026-0042.
 * With a device code (multiple devices without sync): ZW-2026-T2-005.
 * Numbers are assigned on completion and never change afterwards.
 */

export interface ProtocolNumberParts {
  prefix: string
  year: number
  seq: number
  deviceCode?: string
}

export function normalizeCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
}

export function formatProtocolNumber({
  prefix,
  year,
  seq,
  deviceCode,
}: ProtocolNumberParts): string {
  if (!Number.isInteger(seq) || seq < 1) throw new Error(`Invalid sequence: ${seq}`)
  const p = normalizeCode(prefix) || 'BC'
  const d = deviceCode ? normalizeCode(deviceCode) : ''
  return d
    ? `${p}-${year}-${d}-${String(seq).padStart(3, '0')}`
    : `${p}-${year}-${String(seq).padStart(4, '0')}`
}

const PATTERN = /^([A-Z0-9]+)-(\d{4})-(?:([A-Z0-9]+)-)?(\d+)$/

export function parseProtocolNumber(value: string): ProtocolNumberParts | null {
  const m = PATTERN.exec(value)
  if (!m) return null
  return {
    prefix: m[1]!,
    year: Number(m[2]),
    deviceCode: m[3],
    seq: Number(m[4]),
  }
}

/** Key of the per-year counter in the meta table. */
export function counterKey(prefix: string, year: number, deviceCode?: string): string {
  const d = deviceCode ? normalizeCode(deviceCode) : ''
  return `counter:${normalizeCode(prefix)}:${year}${d ? `:${d}` : ''}`
}
