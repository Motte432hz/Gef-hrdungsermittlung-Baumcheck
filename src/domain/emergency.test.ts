import { describe, expect, it } from 'vitest'
import { emergencyText } from './emergency'

describe('emergencyText', () => {
  it('lists the available details, one per line', () => {
    expect(
      emergencyText({
        address: 'Lindenstraße 4, 60311 Frankfurt',
        coords: '50.110924, 8.682127',
        access: 'Einfahrt Hofseite',
      }),
    ).toBe(
      'Adresse: Lindenstraße 4, 60311 Frankfurt\nKoordinaten: 50.110924, 8.682127\nZufahrt/Treffpunkt: Einfahrt Hofseite',
    )
    expect(emergencyText({})).toBe('')
  })
})
