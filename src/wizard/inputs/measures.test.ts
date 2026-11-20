// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { measureStats, orderedMeasures, toggleMeasure } from './measures'

describe('measures', () => {
  it('toggles a measure in the note', () => {
    expect(toggleMeasure('A', 'B')).toBe('A; B')
    expect(toggleMeasure('A; B', 'A')).toBe('B')
  })

  it('learns the company’s own measures and puts frequent ones first', () => {
    const stats = measureStats([
      { 'x.item': { note: 'Bereich gesperrt; Eigene Maßnahme' } },
      { 'x.item': { note: 'Eigene Maßnahme; Bereich gesperrt' } },
      { 'x.item': { note: 'Nur einmal benutzt' } },
      { 'x.item': { note: 'Bereich gesperrt' } },
    ])
    expect(stats.get('x.item')?.get('Bereich gesperrt')).toBe(3)
    const base = ['Wetter beobachten', 'Bereich gesperrt']
    expect(orderedMeasures(base, stats.get('x.item'))).toEqual([
      'Eigene Maßnahme',
      'Bereich gesperrt',
      'Wetter beobachten',
    ])
  })

  it('keeps the given order without history', () => {
    expect(orderedMeasures(['B', 'A'], undefined)).toEqual(['B', 'A'])
  })
})
