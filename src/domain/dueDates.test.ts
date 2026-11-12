import { describe, expect, it } from 'vitest'
import type { Worker } from './types'
import { dueItems, dueText } from './dueDates'

const w = (over: Partial<Worker>): Worker => ({
  id: over.name ?? 'x',
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

describe('due dates', () => {
  it('lists overdue and soon-due certificates and inspections of active people', () => {
    const list = dueItems(
      [
        w({
          name: 'Anna',
          qualifications: [{ type: 'skt_a', validUntil: '2026-11-01' }],
          gear: [
            { id: 'g', name: 'SpiderJack 3', category: 'harness', nextInspection: '2026-12-01' },
          ],
        }),
        w({ name: 'Bernd', qualifications: [{ type: 'skt_b', validUntil: '2027-06-01' }] }), // later
        w({
          name: 'Inaktiv',
          active: false,
          qualifications: [{ type: 'skt_a', validUntil: '2026-01-01' }],
        }),
      ],
      '2026-11-12',
    )
    expect(list.map((i) => [i.workerId, i.label, i.days, i.status])).toEqual([
      ['Anna', 'Nachweis SKT A', -11, 'overdue'],
      ['Anna', 'Prüfung SpiderJack 3', 19, 'soon'],
    ])
  })

  it('says it in plain words', () => {
    expect([dueText(-3), dueText(-1), dueText(0), dueText(1), dueText(12)]).toEqual([
      'seit 3 Tagen fällig',
      'seit gestern fällig',
      'heute fällig',
      'morgen fällig',
      'in 12 Tagen fällig',
    ])
  })
})
