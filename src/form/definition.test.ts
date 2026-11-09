import { describe, expect, it } from 'vitest'
import { allItems, checkDefinition, currentDefinition, findItem, getDefinition } from './definition'
import type { FormDefinition } from './schema'

describe('form definition', () => {
  it('bundled definition is structurally valid', () => {
    expect(checkDefinition(currentDefinition)).toEqual([])
  })

  it('has the ten wizard topics in order (steps 1–8; summary and completion are not form steps)', () => {
    expect(currentDefinition.steps.map((s) => s.id)).toEqual([
      'job',
      'site',
      'team',
      'work',
      'tree',
      'treeAssessment',
      'workplace',
      'equipment',
    ])
  })

  it('can be looked up by version', () => {
    expect(getDefinition('1.0')).toBe(currentDefinition)
    expect(() => getDefinition('0.9')).toThrow()
  })

  it('every checkpoint and hazard has a label, most have an info text', () => {
    const rated = allItems(currentDefinition).filter(
      (l) => l.item.type === 'checkpoint' || l.item.type === 'hazard',
    )
    expect(rated.length).toBeGreaterThan(40)
    for (const { item } of rated) expect(item.label.length).toBeGreaterThan(3)
    const withInfo = rated.filter((l) => l.item.info).length
    expect(withInfo / rated.length).toBeGreaterThan(0.6)
  })

  it('marks proposed additions so they can be reviewed', () => {
    const proposals = allItems(currentDefinition)
      .filter((l) => l.item.proposal)
      .map((l) => l.item.id)
    expect(proposals).toEqual([
      'tree.crown.protectedSpecies',
      'tree.crown.anchorOk',
      'site.propertyInDropZone',
      'site.undergroundUtilities',
      'emergency.firstAider',
    ])
  })

  it('uses the trade term "Hacker", never "Häcksler"', () => {
    expect(JSON.stringify(currentDefinition)).not.toMatch(/Häcksler/i)
    expect(findItem(currentDefinition, 'equip.machinesChecked')?.item.info).toContain('Hacker')
  })

  it('detects structural problems', () => {
    const broken: FormDefinition = structuredClone(currentDefinition)
    const items = broken.steps[0]!.sections[0]!.items
    items.push({ ...items[0]!, label: 'Doppelt' } as (typeof items)[number])
    items.push({
      id: 'job.x',
      type: 'checkpoint',
      label: 'X',
      visibleIf: { field: 'gibt.es.nicht', equals: 'yes' },
    })
    items.push({
      id: 'job.y',
      type: 'checkpoint',
      label: 'Y',
      visibleIf: { field: 'tree.result', equals: 'safe' },
    })
    const problems = checkDefinition(broken)
    expect(problems).toContain('Duplicate item id job.types')
    expect(problems).toContain('job.x: condition references unknown item gibt.es.nicht')
    expect(problems).toContain('job.y: assessment item cannot depend on tree item tree.result')
  })
})
