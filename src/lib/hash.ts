/**
 * Deterministic JSON: object keys sorted, undefined dropped. Used for the content hash,
 * so the same data always yields the same hash regardless of key order.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value))
}

function normalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return null
    return value
  }
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : normalize(v)))
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    const v = (value as Record<string, unknown>)[key]
    if (v !== undefined) out[key] = normalize(v)
  }
  return out
}

export async function sha256Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Short form for the PDF footer, e.g. "3f2a 9c1b 07de". */
export function shortHash(hex: string, groups = 3): string {
  return (hex.match(/.{4}/g) ?? []).slice(0, groups).join(' ')
}
