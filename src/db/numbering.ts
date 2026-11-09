import type { BaumCheckDB } from './db'
import { getDeviceCode } from './repo'
import { counterKey, formatProtocolNumber, normalizeCode } from '../domain/protocolNumber'

export async function getCounter(
  db: BaumCheckDB,
  prefix: string,
  year: number,
  deviceCode?: string,
) {
  return (
    ((await db.meta.get(counterKey(prefix, year, deviceCode)))?.value as number | undefined) ?? 0
  )
}

export interface NumberingInfo {
  prefix: string
  year: number
  deviceCode?: string
  /** Last number used in this series (0 = none yet). */
  current: number
  next: string
}

/** Next protocol number for a prefix in the current year on this device. */
export async function numberingInfo(
  db: BaumCheckDB,
  prefix: string,
  year = new Date().getFullYear(),
): Promise<NumberingInfo> {
  const p = normalizeCode(prefix) || 'BC'
  const deviceCode = await getDeviceCode(db)
  const current = await getCounter(db, p, year, deviceCode)
  return {
    prefix: p,
    year,
    deviceCode,
    current,
    next: formatProtocolNumber({ prefix: p, year, seq: current + 1, deviceCode }),
  }
}

export class NumberTooLowError extends Error {
  constructor(public minimum: number) {
    super(`Next number must be at least ${minimum}`)
    this.name = 'NumberTooLowError'
  }
}

/**
 * Continues an existing series (e.g. from paper forms): the next completed protocol gets
 * `nextSeq`. Numbers can only move forward, never back – that would create duplicates.
 */
export async function setNextNumber(
  db: BaumCheckDB,
  prefix: string,
  year: number,
  nextSeq: number,
): Promise<void> {
  if (!Number.isInteger(nextSeq) || nextSeq < 1) throw new NumberTooLowError(1)
  await db.transaction('rw', db.meta, async () => {
    const p = normalizeCode(prefix) || 'BC'
    const deviceCode = await getDeviceCode(db)
    const current = await getCounter(db, p, year, deviceCode)
    if (nextSeq <= current) throw new NumberTooLowError(current + 1)
    await db.meta.put({ key: counterKey(p, year, deviceCode), value: nextSeq - 1 })
  })
}
