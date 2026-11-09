import { describe, expect, it } from 'vitest'
import { email, emailList, numberPrefix, parseEmailList, postalCode, required } from './validate'
import { qualificationSummary } from './qualifications'
import type { Worker } from './types'

describe('validators', () => {
  it('required', () => {
    expect(required('  ', 'Name')).toBe('Name ist ein Pflichtfeld.')
    expect(required('Anna', 'Name')).toBeUndefined()
  })
  it('email', () => {
    expect(email('')).toBeUndefined()
    expect(email('info@zwieselwiesel.de')).toBeUndefined()
    expect(email('info@')).toBeDefined()
  })
  it('email lists accept lines, commas and semicolons', () => {
    expect(parseEmailList('a@b.de\nc@d.de; e@f.de, ')).toEqual(['a@b.de', 'c@d.de', 'e@f.de'])
    expect(emailList('a@b.de\nquatsch')).toBe('Ungültige E-Mail-Adresse: quatsch')
  })
  it('postal codes for DE (5) and AT/CH (4)', () => {
    expect(postalCode('60311')).toBeUndefined()
    expect(postalCode('1010')).toBeUndefined()
    expect(postalCode('603')).toBeDefined()
  })
  it('number prefix', () => {
    expect(numberPrefix('ZW')).toBeUndefined()
    expect(numberPrefix('Z-W')).toBeDefined()
    expect(numberPrefix('ZWIESEL')).toBeDefined()
  })
})

describe('qualificationSummary', () => {
  const w = (qualifications: Worker['qualifications']) => ({ qualifications }) as Worker
  it('lists qualifications and marks expired ones', () => {
    expect(
      qualificationSummary(
        w([{ type: 'as_baum_1' }, { type: 'skt_a', validUntil: '2026-01-01' }]),
        '2026-11-09',
      ),
    ).toBe('AS-Baum I · SKT A (abgelaufen)')
    expect(qualificationSummary(w([]))).toBe('Keine Qualifikationen hinterlegt')
  })
})
