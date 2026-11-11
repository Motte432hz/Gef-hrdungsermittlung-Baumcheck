import { describe, expect, it } from 'vitest'
import { currentDefinition } from '../form/definition'
import { wizardSteps } from './steps'
import { neighbour } from './navigation'

const steps = wizardSteps(currentDefinition)
const walk = (
  trees: string[],
  start = { stepId: 'job' } as { stepId: string; treeId?: string },
) => {
  const out: string[] = []
  let pos: { stepId: string; treeId?: string } | undefined = start
  while (pos) {
    out.push(pos.treeId ? `${pos.stepId}:${pos.treeId}` : pos.stepId)
    pos = neighbour(steps, pos, trees, 1)
  }
  return out
}

describe('wizard navigation', () => {
  it('walks tree by tree', () => {
    expect(walk(['t1', 't2'])).toEqual([
      'job',
      'site',
      'team',
      'tree:t1',
      'treeAssessment:t1',
      'tree:t2',
      'treeAssessment:t2',
      'workplace',
      'summary',
    ])
  })

  it('without trees the tree steps are passed once', () => {
    expect(walk([])).toEqual([
      'job',
      'site',
      'team',
      'tree',
      'treeAssessment',
      'workplace',
      'summary',
    ])
  })

  it('going back enters the last tree at its assessment', () => {
    expect(neighbour(steps, { stepId: 'workplace' }, ['t1', 't2'], -1)).toEqual({
      stepId: 'treeAssessment',
      treeId: 't2',
    })
    expect(neighbour(steps, { stepId: 'tree', treeId: 't2' }, ['t1', 't2'], -1)).toEqual({
      stepId: 'treeAssessment',
      treeId: 't1',
    })
    expect(neighbour(steps, { stepId: 'tree', treeId: 't1' }, ['t1', 't2'], -1)).toEqual({
      stepId: 'team',
    })
  })

  it('no neighbour beyond the ends', () => {
    expect(neighbour(steps, { stepId: 'job' }, [], -1)).toBeUndefined()
    expect(neighbour(steps, { stepId: 'summary' }, [], 1)).toBeUndefined()
  })
})
