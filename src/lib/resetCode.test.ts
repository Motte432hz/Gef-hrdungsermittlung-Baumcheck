import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../db/db'
import { checkResetCode, hasResetCode, META_RESET_CODE, setResetCode } from './resetCode'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  await db.delete()
})

describe('reset code', () => {
  it('is stored as a salted hash and checked', async () => {
    expect(await hasResetCode(db)).toBe(false)
    expect(await checkResetCode(db, '123456')).toEqual({ ok: false, reason: 'none' })
    await expect(setResetCode(db, '12')).rejects.toThrow(/6 bis 8 Ziffern/)
    await setResetCode(db, '483920')
    const stored = JSON.stringify((await db.meta.get(META_RESET_CODE))?.value)
    expect(stored).not.toContain('483920')
    expect(await checkResetCode(db, '483920')).toEqual({ ok: true })
    expect(await checkResetCode(db, '000000')).toEqual({
      ok: false,
      reason: 'wrong',
      attemptsLeft: 4,
    })
  })

  it('locks for five minutes after five wrong attempts', async () => {
    await setResetCode(db, '483920')
    const t = Date.UTC(2026, 10, 12, 10)
    for (let i = 0; i < 4; i++) await checkResetCode(db, '000000', t)
    expect(await checkResetCode(db, '000000', t)).toMatchObject({ reason: 'locked', minutes: 5 })
    // Even the right code waits until the lock is over.
    expect(await checkResetCode(db, '483920', t + 60_000)).toMatchObject({ reason: 'locked' })
    expect(await checkResetCode(db, '483920', t + 5 * 60_000 + 1)).toEqual({ ok: true })
  })
})
