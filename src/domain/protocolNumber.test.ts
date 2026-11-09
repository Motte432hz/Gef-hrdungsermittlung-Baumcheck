import { describe, expect, it } from 'vitest'
import {
  counterKey,
  formatProtocolNumber,
  normalizeCode,
  parseProtocolNumber,
} from './protocolNumber'

describe('protocol numbers', () => {
  it('formats with four digits', () => {
    expect(formatProtocolNumber({ prefix: 'ZW', year: 2026, seq: 42 })).toBe('ZW-2026-0042')
    expect(formatProtocolNumber({ prefix: 'zw', year: 2026, seq: 12345 })).toBe('ZW-2026-12345')
  })

  it('includes a device code when set', () => {
    expect(formatProtocolNumber({ prefix: 'ZW', year: 2026, seq: 5, deviceCode: 't2' })).toBe(
      'ZW-2026-T2-005',
    )
  })

  it('normalizes codes', () => {
    expect(normalizeCode(' z-w ')).toBe('ZW')
    expect(normalizeCode('Zwieselwiesel')).toBe('ZWIESE')
    expect(formatProtocolNumber({ prefix: '--', year: 2026, seq: 1 })).toBe('BC-2026-0001')
  })

  it('rejects invalid sequence', () => {
    expect(() => formatProtocolNumber({ prefix: 'ZW', year: 2026, seq: 0 })).toThrow()
  })

  it('parses its own output', () => {
    expect(parseProtocolNumber('ZW-2026-0042')).toEqual({
      prefix: 'ZW',
      year: 2026,
      seq: 42,
      deviceCode: undefined,
    })
    expect(parseProtocolNumber('ZW-2026-T2-005')).toEqual({
      prefix: 'ZW',
      year: 2026,
      seq: 5,
      deviceCode: 'T2',
    })
    expect(parseProtocolNumber('Quatsch')).toBeNull()
  })

  it('separate counters per prefix, year and device', () => {
    expect(counterKey('ZW', 2026)).toBe('counter:ZW:2026')
    expect(counterKey('ZW', 2026, 't2')).toBe('counter:ZW:2026:T2')
  })
})
