import { describe, expect, it } from 'vitest'
import {
  allHazards,
  allSpecies,
  getSpecies,
  hazardsForSpecies,
  normalizeSearch,
  OTHER_SPECIES,
  plannedActivities,
  searchSpecies,
  speciesLabel,
} from './species'

describe('species data', () => {
  it('is a large list with native and non-native species', () => {
    expect(allSpecies.length).toBeGreaterThanOrEqual(120)
    expect(allSpecies.filter((s) => s.native).length).toBeGreaterThanOrEqual(40)
    expect(allSpecies.filter((s) => !s.native).length).toBeGreaterThanOrEqual(60)
    expect(allSpecies.filter((s) => s.group === 'nadel').length).toBeGreaterThanOrEqual(25)
  })

  it('has unique ids and German/Latin names, every hazard reference exists', () => {
    const ids = allSpecies.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    const hazardIds = new Set(allHazards.map((h) => h.id))
    for (const s of allSpecies) {
      expect(s.de.trim().length).toBeGreaterThan(2)
      // Botanical names start with a capitalised genus (or a hybrid sign).
      expect(s.la).toMatch(/^(× )?[A-Z][a-z]+ /)
      for (const h of s.hazards) expect(hazardIds.has(h), `${s.la}: ${h}`).toBe(true)
    }
  })

  it('every hazard has a text and at least one advice', () => {
    for (const h of allHazards) {
      expect(h.text.length).toBeGreaterThan(20)
      expect(Object.keys(h.advice).length).toBeGreaterThan(0)
    }
  })

  it('uses the trade term "Hacker", never "Häcksler"', () => {
    expect(JSON.stringify({ allHazards, allSpecies })).not.toMatch(/Häcksler/i)
  })

  it('contains key species with their typical hazards', () => {
    expect(getSpecies('acer-pseudoplatanus')!.hazards).toContain('sooty_bark')
    expect(getSpecies('quercus-robur')!.hazards).toContain('oak_processionary')
    expect(getSpecies('fraxinus-excelsior')!.hazards).toContain('ash_dieback')
    expect(getSpecies('platanus-hispanica')!.hazards).toContain('massaria')
    expect(getSpecies('taxus-baccata')!.hazards).toContain('toxic')
    expect(getSpecies('fagus-sylvatica')!.hazards).toContain('beech_fungi')
  })
})

describe('searchSpecies', () => {
  it('finds by German name, ignoring umlauts and hyphens', () => {
    expect(searchSpecies('bergahorn')[0]!.la).toBe('Acer pseudoplatanus')
    expect(searchSpecies('Rosskast')[0]!.la).toBe('Aesculus hippocastanum')
    expect(searchSpecies('lärche').map((s) => s.de)).toContain('Europäische Lärche')
    expect(searchSpecies('larche').map((s) => s.de)).toContain('Europäische Lärche')
  })
  it('finds by Latin name and aliases', () => {
    expect(searchSpecies('fagus')[0]!.de).toBe('Rot-Buche')
    expect(searchSpecies('Espe')[0]!.la).toBe('Populus tremula')
    expect(searchSpecies('Robinie')[0]!.la).toBe('Robinia pseudoacacia')
  })
  it('generic terms list all matching species', () => {
    const eichen = searchSpecies('eiche', 50).map((s) => s.la)
    expect(eichen).toEqual(
      expect.arrayContaining(['Quercus robur', 'Quercus petraea', 'Quercus rubra']),
    )
  })
  it('empty query returns nothing', () => {
    expect(searchSpecies('  ')).toEqual([])
    expect(normalizeSearch('Groß-Blättrige Ahorn')).toBe('gross blattrige ahorn')
  })
})

describe('speciesLabel', () => {
  it('formats known and other species', () => {
    expect(speciesLabel({ value: 'acer-pseudoplatanus' })).toBe('Berg-Ahorn (Acer pseudoplatanus)')
    expect(speciesLabel({ value: OTHER_SPECIES, otherText: 'Mispel' })).toBe('Mispel')
    expect(speciesLabel({ value: OTHER_SPECIES })).toBeUndefined()
    expect(speciesLabel(undefined)).toBeUndefined()
  })
})

describe('activities and hazards', () => {
  it('derives activities from job and work types', () => {
    const a = plannedActivities({
      'job.types': { value: ['rope_access'] },
      'work.types': { value: ['deadwood'] },
    })
    expect([...a].sort()).toEqual(['chipping', 'climbing', 'pruning'])
    const f = plannedActivities({
      'job.types': { value: ['tree_work'] },
      'work.types': { value: ['felling_rigging'] },
    })
    expect([...f].sort()).toEqual(['chipping', 'felling', 'rigging'])
  })

  it('without a plan all activities are shown', () => {
    expect(plannedActivities({}).size).toBe(5)
  })

  it('rigging also from the workplace hazard', () => {
    const a = plannedActivities({
      'work.types': { value: ['crown_reduction'] },
      'site.riggingRequired': { value: 'present' },
    })
    expect(a.has('rigging')).toBe(true)
  })

  it('shows only advice for planned activities, relevant hazards first', () => {
    const ash = getSpecies('fraxinus-excelsior')!
    const felling = hazardsForSpecies(ash, new Set(['felling', 'chipping']))
    expect(felling.map((v) => [v.hazard.id, v.relevant])).toEqual([
      ['ash_dieback', true],
      ['barber_chair', true],
    ])
    expect(felling[0]!.advice.map((a) => a.key)).toEqual(['felling'])

    const pruning = hazardsForSpecies(ash, new Set(['pruning', 'chipping']))
    // Barber chair is only a felling hazard → not relevant for crown work, listed last.
    expect(pruning.map((v) => [v.hazard.id, v.relevant])).toEqual([
      ['ash_dieback', false],
      ['barber_chair', false],
    ])
  })

  it('general advice is always included', () => {
    const maple = getSpecies('acer-pseudoplatanus')!
    const [sooty] = hazardsForSpecies(maple, new Set(['chipping']))
    expect(sooty!.hazard.id).toBe('sooty_bark')
    expect(sooty!.advice.map((a) => a.key)).toEqual(['general', 'chipping'])
  })
})
