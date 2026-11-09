import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from './db'
import { completeAssessment, createAssessment, ensureOrganization, META_DEVICE_CODE } from './repo'
import { saveOrganization } from './profiles'
import { numberingInfo, NumberTooLowError, setNextNumber } from './numbering'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  await db.delete()
})

describe('numbering', () => {
  it('previews the next number per prefix and year', async () => {
    expect((await numberingInfo(db, 'zw', 2026)).next).toBe('ZW-2026-0001')
    await db.meta.put({ key: META_DEVICE_CODE, value: 'T2' })
    expect((await numberingInfo(db, 'ZW', 2026)).next).toBe('ZW-2026-T2-001')
  })

  it('a series can be continued, but never moved back', async () => {
    await setNextNumber(db, 'ZW', 2026, 57)
    expect((await numberingInfo(db, 'ZW', 2026)).next).toBe('ZW-2026-0057')
    await expect(setNextNumber(db, 'ZW', 2026, 12)).rejects.toBeInstanceOf(NumberTooLowError)
    await expect(setNextNumber(db, 'ZW', 2026, 56)).rejects.toMatchObject({ minimum: 57 })
    // Other prefixes and years are independent.
    expect((await numberingInfo(db, 'AB', 2026)).next).toBe('AB-2026-0001')
    expect((await numberingInfo(db, 'ZW', 2027)).next).toBe('ZW-2027-0001')
  })

  it('completion uses the continued series; a new prefix starts a new series', async () => {
    const org = await ensureOrganization(db, { name: 'Zwieselwiesel', numberPrefix: 'ZW' })
    await setNextNumber(db, 'ZW', 2026, 100)
    const a = await createAssessment(db, org.id, '1.0', { date: '2026-11-09' })
    expect((await completeAssessment(db, a.id, { contentHash: 'h' })).protocolNumber).toBe(
      'ZW-2026-0100',
    )
    await saveOrganization(db, org.id, { numberPrefix: 'ZWB' })
    const b = await createAssessment(db, org.id, '1.0', { date: '2026-11-10' })
    expect((await completeAssessment(db, b.id, { contentHash: 'h' })).protocolNumber).toBe(
      'ZWB-2026-0001',
    )
  })
})
