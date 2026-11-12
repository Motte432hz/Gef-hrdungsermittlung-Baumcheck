import { describe, expect, it } from 'vitest'
import { appendDictation, speechErrorMessage } from './speech'

describe('dictation', () => {
  it('appends phrases with sensible spacing and capitals', () => {
    let t = appendDictation('', 'netzbetreiber schaltet frei')
    expect(t).toBe('Netzbetreiber schaltet frei')
    t = appendDictation(t, 'termin am dienstag')
    expect(t).toBe('Netzbetreiber schaltet frei termin am dienstag')
    t = appendDictation(`${t}.`, 'danach fällen')
    expect(t).toBe('Netzbetreiber schaltet frei termin am dienstag. Danach fällen')
    expect(appendDictation('Text', '   ')).toBe('Text')
  })

  it('explains errors, ignores normal ends', () => {
    expect(speechErrorMessage('no-speech')).toBeUndefined()
    expect(speechErrorMessage('not-allowed')).toMatch(/Mikrofon nicht erlaubt/)
  })
})
