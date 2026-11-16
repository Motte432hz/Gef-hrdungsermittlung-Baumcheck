import { describe, expect, it } from 'vitest'
import { getGuide, guideGroups, guides, pageHelp, stepHelp } from './guides'
import { currentDefinition } from '../form/definition'
import { wizardSteps } from '../wizard/steps'
import { routes } from '../app/router'

describe('help content', () => {
  it('references existing guides only', () => {
    const ids = guides.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    const referenced = [
      ...guideGroups.flatMap((g) => g.guides),
      ...Object.values(stepHelp).flatMap((h) => h.guides),
    ]
    for (const id of referenced) expect(getGuide(id), id).toBeDefined()
    // Every guide is listed in the help centre exactly once.
    expect(guideGroups.flatMap((g) => g.guides).sort()).toEqual([...ids].sort())
  })

  it('has help for every wizard step', () => {
    for (const step of wizardSteps(currentDefinition))
      expect(stepHelp[step.id], step.id).toBeDefined()
  })

  it('finds the help for a page by its path', () => {
    expect(pageHelp('/')?.title).toBe('Startseite')
    expect(pageHelp('/profile/team/person/abc')?.title).toBe('Team & Partner')
    expect(pageHelp('/profile/firma/cloud')?.title).toBe('Firmen-Kartei (Cloud)')
    expect(pageHelp('/protokoll/123')?.title).toBe('Protokoll')
    expect(pageHelp('/hilfe')).toBeUndefined()
  })

  it('links only to pages that exist', () => {
    const paths = JSON.stringify(routes)
    for (const g of guides)
      if (g.start && g.start.to !== '/') {
        const path = g.start.to.slice(1)
        expect(paths, g.start.to).toContain(`"path":"${path}"`)
      }
  })
})
