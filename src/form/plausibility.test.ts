import { describe, expect, it } from 'vitest'
import { checkTeam } from './plausibility'
import { member } from '../test/fixtures'
import type { Answers } from '../domain/types'

const answers = (types: string[]): Answers => ({ 'job.types': { value: types } })
const skt = [{ type: 'skt_b' as const }]

describe('checkTeam', () => {
  it('SKT needs two SKT-qualified people and a ground person', () => {
    const team = [member({ qualifications: skt, roles: ['supervisor', 'climber'] })]
    const issues = checkTeam(
      { answers: answers(['rope_access']), team, date: '2026-11-09' },
      'team',
    )
    expect(issues).toEqual([expect.objectContaining({ key: 'team:skt', level: 'warning' })])
    expect(issues[0]!.message).toContain('aktuell: 1 mit SKT, keine Bodenperson')
  })

  it('SKT rule satisfied', () => {
    const team = [
      member({ qualifications: skt, roles: ['supervisor', 'climber'] }),
      member({ name: 'Bernd Borke', qualifications: [{ type: 'skt_a' }], roles: ['ground'] }),
    ]
    expect(
      checkTeam({ answers: answers(['rope_access']), team, date: '2026-11-09' }, 'team'),
    ).toEqual([])
  })

  it('SKT rule not applied without rope access', () => {
    const team = [member()]
    expect(
      checkTeam({ answers: answers(['tree_work']), team, date: '2026-11-09' }, 'team'),
    ).toEqual([])
  })

  it('hints for platform and crane roles', () => {
    const issues = checkTeam(
      { answers: answers(['aerial_platform', 'crane']), team: [member()], date: '2026-11-09' },
      'team',
    )
    expect(issues.map((i) => i.key)).toEqual(['team:platform', 'team:crane'])
    expect(issues.every((i) => i.level === 'info')).toBe(true)
  })

  it('warns about members without role', () => {
    const issues = checkTeam(
      {
        answers: answers([]),
        team: [member({ name: 'Carla Zapfen', roles: [] })],
        date: '2026-11-09',
      },
      'team',
    )
    expect(issues[0]!.message).toBe('Carla Zapfen hat noch keine Rolle.')
  })

  it('expired and soon expiring certificates', () => {
    const team = [
      member({
        name: 'Anna Ast',
        qualifications: [
          { type: 'skt_a', validUntil: '2026-10-31' },
          { type: 'as_baum_1', validUntil: '2026-11-30' },
          { type: 'skt_b', validUntil: '2027-06-01' },
        ],
      }),
    ]
    const issues = checkTeam({ answers: answers([]), team, date: '2026-11-09' }, 'team')
    expect(issues.map((i) => [i.level, i.message])).toEqual([
      ['warning', 'Nachweis SKT A von Anna Ast ist seit 31.10.2026 abgelaufen.'],
      ['info', 'Nachweis AS-Baum I von Anna Ast läuft am 30.11.2026 ab.'],
    ])
  })
})

describe('gear inspections', () => {
  it('overdue and soon due inspections', () => {
    const team = [
      member({
        name: 'Anna Ast',
        gear: [
          {
            id: 'g1',
            name: 'Petzl Sequoia SRT',
            category: 'harness',
            nextInspection: '2026-10-01',
          },
          { id: 'g2', name: 'SpiderJack 3', category: 'friction', nextInspection: '2026-11-20' },
          { id: 'g3', name: 'Petzl Zigzag', category: 'friction', nextInspection: '2027-06-01' },
          { id: 'g4', name: 'Helm', category: 'helmet' },
        ],
      }),
    ]
    const issues = checkTeam({ answers: answers([]), team, date: '2026-11-09' }, 'team')
    expect(issues.map((i) => [i.level, i.message])).toEqual([
      ['warning', 'Prüfung von Petzl Sequoia SRT (Anna Ast) war am 01.10.2026 fällig.'],
      ['info', 'Prüfung von SpiderJack 3 (Anna Ast) ist am 20.11.2026 fällig.'],
    ])
  })
})
