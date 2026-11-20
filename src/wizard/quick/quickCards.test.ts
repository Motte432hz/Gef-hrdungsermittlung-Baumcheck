// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { currentDefinition } from '../../form/definition'
import { makeLookup } from '../../form/validation'
import type { Answers } from '../../domain/types'
import { isOpenCard, nextOpenCard, quickCards } from './quickCards'

const step = (id: string) => currentDefinition.steps.find((s) => s.id === id)!
// Climbing: the anchor point checkpoint is shown.
const job: Answers = { 'job.types': { value: ['rope_access'] } }
const cardsFor = (id: string, answers: Answers) =>
  quickCards(step(id), answers, makeLookup(job, answers, '2026-11-20'))

describe('quick mode cards', () => {
  it('a gated section shows the filter question; its hazards only after "Ja"', () => {
    const closed = cardsFor('treeAssessment', {}).map((c) => c.id)
    expect(closed).toContain('tree.env.gate')
    expect(closed).not.toContain('tree.env.soilCracks')
    const open = cardsFor('treeAssessment', { 'tree.env.gate': { value: 'some' } }).map((c) => c.id)
    const gate = open.indexOf('tree.env.gate')
    expect(open[gate + 1]).toBe('tree.env.soilCracks')
  })

  it('text and choice questions are not part of the quick mode', () => {
    const ids = cardsFor('treeAssessment', {}).map((c) => c.id)
    expect(ids).not.toContain('tree.result')
    expect(ids).not.toContain('tree.crown.vitality')
    expect(ids).toContain('tree.crown.anchorOk')
  })

  it('open: unanswered, prefilled or a finding without measure', () => {
    const [card] = cardsFor('treeAssessment', {}).filter((c) => c.kind === 'checkpoint')
    expect(isOpenCard(card!, {})).toBe(true)
    expect(isOpenCard(card!, { [card!.id]: { value: 'yes', prefilled: true } })).toBe(true)
    expect(isOpenCard(card!, { [card!.id]: { value: 'no' } })).toBe(true)
    expect(isOpenCard(card!, { [card!.id]: { value: 'no', note: 'Seil anders' } })).toBe(false)
    expect(isOpenCard(card!, { [card!.id]: { value: 'yes' } })).toBe(false)
  })

  it('goes to the next open card', () => {
    const answers: Answers = { 'tree.env.gate': { value: 'none' } }
    const cards = cardsFor('treeAssessment', answers)
    expect(nextOpenCard(cards, answers)?.id).toBe('tree.trunk.gate')
  })
})
