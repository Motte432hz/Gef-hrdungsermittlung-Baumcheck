// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { glossary, glossaryEntry, searchGlossary, splitTerms } from './glossary'
import { currentDefinition } from '../form/definition'

const marked = (text: string) =>
  splitTerms(text)
    .filter((p) => typeof p !== 'string')
    .map((p) => (typeof p === 'string' ? p : p.entry.id))

describe('glossary', () => {
  it('has unique ids and valid cross references', () => {
    const ids = glossary.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of glossary)
      for (const id of e.see ?? []) expect(glossaryEntry(id), id).toBeDefined()
  })

  it('uses each spelling for one entry only', () => {
    const forms = glossary.flatMap((e) => e.forms)
    expect(new Set(forms).size).toBe(forms.length)
  })

  it('marks whole words only and each term once', () => {
    expect(marked('Druckzwiesel und Zwiesel')).toEqual(['druckzwiesel', 'zwiesel'])
    expect(marked('Aufsichtsführende Person')).toEqual([]) // the whole label is the term
    expect(marked('Die Aufsichtsbehörde')).toEqual([])
    expect(marked('PSA geprüft, PSA vorhanden')).toEqual(['psa'])
  })

  it('prefers the longest spelling', () => {
    const parts = splitTerms('Nachweise wie SKT A/B liegen vor')
    expect(parts).toContainEqual(expect.objectContaining({ text: 'SKT A/B' }))
  })

  it('keeps the text intact', () => {
    const text = 'Rückweichen sind angelegt, der Fallbereich ist frei.'
    const joined = splitTerms(text)
      .map((p) => (typeof p === 'string' ? p : p.text))
      .join('')
    expect(joined).toBe(text)
  })

  it('searches terms first, then explanations', () => {
    expect(searchGlossary('zwiesel')[0]?.id).toMatch(/zwiesel/)
    expect(searchGlossary('Brennhaare').map((e) => e.id)).toEqual(['eichenprozessionsspinner'])
    expect(searchGlossary('').length).toBe(glossary.length)
  })

  it('explains terms used in the form', () => {
    const used = new Set<string>()
    for (const step of currentDefinition.steps)
      for (const section of step.sections)
        for (const item of section.items)
          for (const text of [item.label, item.info ?? ''])
            for (const p of splitTerms(text)) if (typeof p !== 'string') used.add(p.entry.id)
    for (const id of ['psa', 'kappung', 'rueckweiche', 'skt', 'schonzeit', 'hacker'])
      expect(used, id).toContain(id)
  })
})
