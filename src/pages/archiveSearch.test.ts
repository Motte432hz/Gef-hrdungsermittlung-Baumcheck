import { describe, expect, it } from 'vitest'
import { matches, searchText } from './archiveSearch'
import type { Assessment, Customer, Tree } from '../domain/types'

describe('archive search', () => {
  const a = {
    protocolNumber: 'ZW-2026-0042',
    customerId: 'c1',
    siteId: 's1',
    answers: { 'site.address': { value: 'Lindenstraße 4, Frankfurt' } },
    team: [{ name: 'Anna Äst', company: 'Kletterteam Süd' }],
  } as unknown as Assessment
  const customers = [
    {
      id: 'c1',
      name: 'Hausverwaltung Müller',
      sites: [{ id: 's1', name: 'Wohnanlage Lindenstraße' }],
    },
  ] as unknown as Customer[]
  const trees = [{ answers: { 'tree.species': { value: 'tilia-cordata' } } }] as unknown as Tree[]
  const text = searchText(a, customers, trees)

  it.each([
    ['0042', true],
    ['zw-2026', true],
    ['muller', true],
    ['Müller Linden', true],
    ['anna ast', true],
    ['winter-linde', true],
    ['Tilia', true],
    ['Eiche', false],
    ['Müller Eiche', false],
  ])('%s → %s', (q, expected) => {
    expect(matches(text, q)).toBe(expected)
  })
})
