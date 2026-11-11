import { describe, expect, it } from 'vitest'
import type { Worker } from '../../domain/types'
import { addWorkers, companyGroups, searchKey, suggestRoles } from './teamOps'

const worker = (over: Partial<Worker>): Worker => ({
  id: crypto.randomUUID(),
  organizationId: 'o',
  createdAt: '',
  updatedAt: '',
  syncState: 'pending',
  kind: 'employee',
  name: 'X',
  qualifications: [],
  active: true,
  ...over,
})

describe('suggestRoles', () => {
  it('first person supervises, SKT people climb with rope access, others on the ground', () => {
    expect(suggestRoles([], [], [])).toEqual(['supervisor'])
    const team = [{ roles: ['supervisor' as const] }]
    expect(suggestRoles(team, [{ type: 'skt_b' }], ['rope_access'])).toEqual(['climber'])
    expect(suggestRoles(team, [{ type: 'skt_b' }], ['tree_work'])).toEqual(['ground'])
    expect(suggestRoles(team, [], ['rope_access'])).toEqual(['ground'])
  })
})

describe('addWorkers', () => {
  it('adds several people with progressive role proposals', () => {
    const team = addWorkers(
      [],
      [worker({ name: 'A' }), worker({ name: 'B', qualifications: [{ type: 'skt_a' }] })],
      ['rope_access'],
    )
    expect(team.map((m) => [m.name, m.roles])).toEqual([
      ['A', ['supervisor']],
      ['B', ['climber']],
    ])
  })
})

describe('companyGroups', () => {
  it('groups subcontractors by company (case-insensitive), only groups of two or more', () => {
    const groups = companyGroups([
      worker({ kind: 'subcontractor', name: 'Karl', company: 'Kletterteam Süd' }),
      worker({ kind: 'subcontractor', name: 'Kim', company: 'kletterteam süd ' }),
      worker({ kind: 'subcontractor', name: 'Solo', company: 'Einzel GmbH' }),
      worker({ kind: 'employee', name: 'Anna', company: 'Kletterteam Süd' }),
    ])
    expect(groups.map((g) => [g.company, g.workers.map((w) => w.name)])).toEqual([
      ['Kletterteam Süd', ['Karl', 'Kim']],
    ])
  })
})

it('searchKey ignores case and accents', () => {
  expect(searchKey(' Müller ')).toBe(searchKey('muller'))
})
