import { describe, expect, it } from 'vitest'
import { hasMeasure, toggleMeasure } from './measures'

describe('measure quick picks', () => {
  it('adds, keeps free text and removes again', () => {
    let note = ''
    note = toggleMeasure(note, 'Netzbetreiber schaltet frei')
    expect(note).toBe('Netzbetreiber schaltet frei')
    note = `${note}; Termin am Dienstag`
    note = toggleMeasure(note, 'Elektrofachkraft vor Ort')
    expect(note).toBe('Netzbetreiber schaltet frei; Termin am Dienstag; Elektrofachkraft vor Ort')
    expect(hasMeasure(note, 'Elektrofachkraft vor Ort')).toBe(true)
    note = toggleMeasure(note, 'Netzbetreiber schaltet frei')
    expect(note).toBe('Termin am Dienstag; Elektrofachkraft vor Ort')
  })
})
