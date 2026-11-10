import { describe, expect, it } from 'vitest'
import { gearCatalog, searchGear } from './equipmentCatalog'

describe('gear catalogue', () => {
  it('has unique ids and many entries', () => {
    const ids = gearCatalog.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(gearCatalog.length).toBeGreaterThan(100)
  })

  it.each([
    ['spider', 'SpiderJack 3'],
    ['spiderjack', 'SpiderJack 3'],
    ['zickzack', 'Petzl Zigzag'],
    ['sequoia s', 'Petzl Sequoia SRT'],
    ['treemo', 'Teufelberger treeMOTION'],
    ['ms 201', 'Stihl MS 201 TC-M'],
    ['amd', "Petzl Am'D"],
    ['prusik', 'Klemmknoten-Cord (Prusik)'],
  ])('"%s" finds %s first', (q, name) => {
    expect(searchGear(q)[0]!.name).toBe(name)
  })

  it('category words list matching gear', () => {
    const names = searchGear('klettergurt', 20).map((g) => g.name)
    expect(names).toEqual(expect.arrayContaining(['Petzl Sequoia', 'Edelrid TreeRex']))
  })

  it('empty query returns nothing', () => {
    expect(searchGear(' ')).toEqual([])
  })
})
