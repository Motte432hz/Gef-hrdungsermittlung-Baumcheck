// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Issue } from '../form/validation'
import { issuePath, nextIssue } from './nextIssue'

const steps = ['job', 'site', 'tree', 'summary']
const trees = ['t1', 't2']
const issue = (
  stepId: string,
  itemId: string,
  treeId?: string,
  level: Issue['level'] = 'blocking',
): Issue => ({
  key: `${stepId}:${treeId ?? ''}:${itemId}`,
  level,
  stepId,
  itemId,
  treeId,
  message: '',
})

describe('next open point', () => {
  const issues = [
    issue('job', 'a'),
    issue('site', 'w', undefined, 'warning'),
    issue('tree', 'x', 't1'),
    issue('tree', 'y', 't2'),
  ]

  it('starts in the current step', () => {
    expect(nextIssue(issues, steps, trees, { stepId: 'job' })?.itemId).toBe('a')
  })

  it('skips warnings and goes on to later steps and trees', () => {
    expect(nextIssue(issues, steps, trees, { stepId: 'site' })?.itemId).toBe('x')
    expect(nextIssue(issues, steps, trees, { stepId: 'tree', treeId: 't2' })?.itemId).toBe('y')
  })

  it('starts again at the beginning after the last point', () => {
    expect(nextIssue(issues, steps, trees, { stepId: 'summary' })?.itemId).toBe('a')
  })

  it('returns nothing when all is done', () => {
    expect(
      nextIssue([issue('job', 'a', undefined, 'warning')], steps, trees, { stepId: 'job' }),
    ).toBeUndefined()
  })

  it('builds the address with tree and anchor', () => {
    expect(issuePath('A', { stepId: 'tree', treeId: 't1', itemId: 'tree.height' })).toBe(
      '/einsatz/A/tree?baum=t1#item-t1-tree-height',
    )
  })
})
