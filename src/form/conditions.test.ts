import { describe, expect, it } from 'vitest'
import { conditionFields, evaluateCondition } from './conditions'

const values: Record<string, unknown> = {
  'job.types': ['rope_access', 'tree_work'],
  'site.riggingRequired': 'present',
  'tree.height': 18,
}
const lookup = (f: string) => values[f] as never

describe('evaluateCondition', () => {
  it('no condition means visible', () => {
    expect(evaluateCondition(undefined, lookup)).toBe(true)
  })
  it('equals', () => {
    expect(evaluateCondition({ field: 'site.riggingRequired', equals: 'present' }, lookup)).toBe(
      true,
    )
    expect(evaluateCondition({ field: 'site.riggingRequired', equals: 'absent' }, lookup)).toBe(
      false,
    )
    expect(evaluateCondition({ field: 'tree.height', equals: 18 }, lookup)).toBe(true)
  })
  it('includes / includesAny on multi values', () => {
    expect(evaluateCondition({ field: 'job.types', includes: 'rope_access' }, lookup)).toBe(true)
    expect(evaluateCondition({ field: 'job.types', includes: 'crane' }, lookup)).toBe(false)
    expect(
      evaluateCondition({ field: 'job.types', includesAny: ['crane', 'tree_work'] }, lookup),
    ).toBe(true)
    expect(evaluateCondition({ field: 'missing', includes: 'x' }, lookup)).toBe(false)
  })
  it('includes works on single values too', () => {
    expect(evaluateCondition({ field: 'site.riggingRequired', includes: 'present' }, lookup)).toBe(
      true,
    )
  })
  it('all / any / not', () => {
    const c = {
      all: [
        { field: 'job.types', includes: 'rope_access' },
        { not: { field: 'site.riggingRequired', equals: 'absent' } },
      ],
    }
    expect(evaluateCondition(c, lookup)).toBe(true)
    expect(
      evaluateCondition(
        {
          any: [
            { field: 'x', equals: 1 },
            { field: 'y', equals: 2 },
          ],
        },
        lookup,
      ),
    ).toBe(false)
    expect(conditionFields(c)).toEqual(['job.types', 'site.riggingRequired'])
  })
})
