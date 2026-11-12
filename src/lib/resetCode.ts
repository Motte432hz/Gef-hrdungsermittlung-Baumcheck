import type { BaumCheckDB } from '../db/db'

/**
 * Reset code: protects "App zurücksetzen" (e.g. on company devices). Stored only as a
 * salted PBKDF2 hash on this device; wrong attempts lead to a short lock.
 */
export const META_RESET_CODE = 'resetCode'
const META_RESET_ATTEMPTS = 'resetAttempts'
const ITERATIONS = 150_000
const MAX_ATTEMPTS = 5
const LOCK_MS = 5 * 60_000

interface StoredCode {
  salt: string
  hash: string
}
interface Attempts {
  count: number
  lockedUntil?: number
}

const hex = (b: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('')
const fromHex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)))

async function derive(code: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return hex(bits)
}

/** 6 to 8 digits. */
export function validResetCode(code: string): string | undefined {
  return /^\d{6,8}$/.test(code) ? undefined : 'Bitte 6 bis 8 Ziffern verwenden.'
}

export async function hasResetCode(db: BaumCheckDB): Promise<boolean> {
  return !!(await db.meta.get(META_RESET_CODE))
}

export async function setResetCode(db: BaumCheckDB, code: string) {
  const err = validResetCode(code)
  if (err) throw new Error(err)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const value: StoredCode = { salt: hex(salt), hash: await derive(code, salt) }
  await db.meta.put({ key: META_RESET_CODE, value })
  await db.meta.delete(META_RESET_ATTEMPTS)
}

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: 'wrong'; attemptsLeft: number }
  | { ok: false; reason: 'locked'; minutes: number }
  | { ok: false; reason: 'none' }

export async function checkResetCode(
  db: BaumCheckDB,
  code: string,
  now = Date.now(),
): Promise<CheckResult> {
  const stored = (await db.meta.get(META_RESET_CODE))?.value as StoredCode | undefined
  if (!stored) return { ok: false, reason: 'none' }
  const attempts = ((await db.meta.get(META_RESET_ATTEMPTS))?.value as Attempts | undefined) ?? {
    count: 0,
  }
  if (attempts.lockedUntil && attempts.lockedUntil > now)
    return {
      ok: false,
      reason: 'locked',
      minutes: Math.ceil((attempts.lockedUntil - now) / 60_000),
    }
  if ((await derive(code, fromHex(stored.salt))) === stored.hash) {
    await db.meta.delete(META_RESET_ATTEMPTS)
    return { ok: true }
  }
  const count = (attempts.lockedUntil ? 0 : attempts.count) + 1
  if (count >= MAX_ATTEMPTS) {
    await db.meta.put({ key: META_RESET_ATTEMPTS, value: { count: 0, lockedUntil: now + LOCK_MS } })
    return { ok: false, reason: 'locked', minutes: LOCK_MS / 60_000 }
  }
  await db.meta.put({ key: META_RESET_ATTEMPTS, value: { count } })
  return { ok: false, reason: 'wrong', attemptsLeft: MAX_ATTEMPTS - count }
}

export function resetCodeMessage(r: CheckResult): string | undefined {
  if (r.ok) return undefined
  if (r.reason === 'none') return 'Es ist noch kein Reset-Code festgelegt.'
  if (r.reason === 'locked')
    return `Zu viele falsche Versuche. Bitte in ${r.minutes} ${r.minutes === 1 ? 'Minute' : 'Minuten'} erneut versuchen.`
  return `Falscher Code. Noch ${r.attemptsLeft} ${r.attemptsLeft === 1 ? 'Versuch' : 'Versuche'}.`
}
