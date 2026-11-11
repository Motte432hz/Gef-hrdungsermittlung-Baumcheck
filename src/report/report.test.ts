import { describe, expect, it } from 'vitest'
import { assessmentContentHash } from './contentHash'
import { allSigned, requiredSignatures } from './signatures'
import { buildSummary, signaturePlace } from './summary'
import { currentDefinition as def } from '../form/definition'
import { member, validInput } from '../test/fixtures'
import type { Assessment, Signature } from '../domain/types'

const assessmentFrom = (input = validInput(def)): Assessment => ({
  id: 'a1',
  organizationId: 'o1',
  createdAt: '',
  updatedAt: '',
  syncState: 'pending',
  status: 'draft',
  formVersion: '1.0',
  version: 1,
  ...input.assessment,
})

describe('assessmentContentHash', () => {
  it('is stable and changes with the content', async () => {
    const input = validInput(def)
    const a = assessmentFrom(input)
    const h1 = await assessmentContentHash(a, input.trees)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
    expect(await assessmentContentHash({ ...a }, input.trees)).toBe(h1)
    // Bookkeeping fields do not matter.
    expect(
      await assessmentContentHash(
        { ...a, updatedAt: 'x', syncState: 'synced' } as Assessment,
        input.trees,
      ),
    ).toBe(h1)
    // Answers, trees and photos do.
    const changed = { ...a, answers: { ...a.answers, 'team.briefed': { value: 'no', note: 'x' } } }
    expect(await assessmentContentHash(changed, input.trees)).not.toBe(h1)
    const treeChanged = [
      { ...input.trees[0]!, answers: { ...input.trees[0]!.answers, 'tree.height': { value: 99 } } },
    ]
    expect(await assessmentContentHash(a, treeChanged)).not.toBe(h1)
    expect(await assessmentContentHash(a, input.trees, { t1: ['p1'] })).not.toBe(h1)
  })
})

describe('requiredSignatures', () => {
  const sup = member({ id: 'm1', name: 'Anna Ast', roles: ['supervisor'] })
  const climber = member({ id: 'm2', name: 'Karl Kletter', roles: ['climber'] })
  const sig = (
    memberId: string,
    statement: Signature['statement'],
    contentHash: string,
    signedAt = '2026-11-09T08:00:00Z',
  ) => ({ memberId, statement, contentHash, signedAt }) as Signature

  it('supervisor signs the assessment statement, others the instruction statement', () => {
    const req = requiredSignatures([sup, climber], 'm1', [], 'h')
    expect(req.map((r) => [r.member.name, r.statement])).toEqual([
      ['Anna Ast', 'supervisor'],
      ['Karl Kletter', 'member'],
    ])
    expect(allSigned(req)).toBe(false)
  })

  it('complete when all signed with the current content', () => {
    const req = requiredSignatures(
      [sup, climber],
      'm1',
      [sig('m1', 'supervisor', 'h'), sig('m2', 'member', 'h')],
      'h',
    )
    expect(allSigned(req)).toBe(true)
  })

  it('signatures become outdated when the content changes', () => {
    const req = requiredSignatures(
      [sup, climber],
      'm1',
      [sig('m1', 'supervisor', 'old'), sig('m2', 'member', 'h')],
      'h',
    )
    expect(req[0]!.outdated).toBe(true)
    expect(allSigned(req)).toBe(false)
  })

  it('the newest signature counts', () => {
    const req = requiredSignatures(
      [sup],
      'm1',
      [
        sig('m1', 'supervisor', 'old', '2026-11-09T08:00:00Z'),
        sig('m1', 'supervisor', 'h', '2026-11-09T09:00:00Z'),
      ],
      'h',
    )
    expect(req[0]!.outdated).toBe(false)
  })

  it('nobody to sign is never complete', () => {
    expect(allSigned(requiredSignatures([], undefined, [], 'h'))).toBe(false)
  })
})

describe('buildSummary', () => {
  it('condenses a gated section answered "none" into one row', () => {
    const input = validInput(def)
    const t = input.trees[0]!
    t.answers['tree.env.gate'] = { value: 'none' }
    for (const k of ['soilCracks', 'neighbourTrees', 'rootDamage', 'fungi'])
      delete t.answers[`tree.env.${k}`]
    const sections = buildSummary({
      definition: def,
      assessment: assessmentFrom(input),
      trees: input.trees as never,
    })
    const rows = sections.find((s) => s.title === 'Baumbeurteilung – Baum 1')!.rows
    expect(rows.filter((r) => r.itemId.startsWith('tree.env.'))).toEqual([
      expect.objectContaining({
        itemId: 'tree.env.gate',
        value: 'keine Auffälligkeiten (4 Merkmale geprüft)',
        tone: 'ok',
      }),
    ])
  })

  it('lists all steps, one section per tree', () => {
    const input = validInput(def)
    input.trees.push({ id: 't2', index: 1, answers: {} })
    const sections = buildSummary({
      definition: def,
      assessment: assessmentFrom(input),
      trees: input.trees as never,
    })
    expect(sections.map((s) => s.title)).toEqual([
      'Einsatz',
      'Standort & Rettung',
      'Team',
      'Baum – Baum 1',
      'Baum – Baum 2',
      'Baumbeurteilung – Baum 1',
      'Baumbeurteilung – Baum 2',
      'Einsatzort & Ausrüstung',
    ])
  })

  it('formats answers and highlights deviations with their measures', () => {
    const input = validInput(def)
    input.assessment.answers['site.powerLines'] = {
      value: 'present',
      note: 'Freischaltung beantragt',
    }
    input.assessment.answers['team.fitForWork'] = { value: 'no', note: 'Kollege bleibt am Boden' }
    input.trees[0]!.answers['tree.result'] = { value: 'unsafe', note: 'Hubarbeitsbühne' }
    input.trees[0]!.answers['tree.species'] = { value: 'acer-pseudoplatanus' }
    input.trees[0]!.answers['tree.height'] = { value: 18.5 }
    const sections = buildSummary({
      definition: def,
      assessment: assessmentFrom(input),
      trees: input.trees as never,
      photoCount: { t1: 2 },
    })
    const rows = Object.fromEntries(sections.flatMap((s) => s.rows).map((r) => [r.itemId, r]))
    expect(rows['site.powerLines']).toMatchObject({
      value: 'vorhanden',
      tone: 'bad',
      note: 'Freischaltung beantragt',
      noteLabel: 'Maßnahme',
    })
    expect(rows['team.fitForWork']).toMatchObject({
      value: 'Nein',
      tone: 'bad',
      noteLabel: 'Maßnahme / Begründung',
    })
    expect(rows['tree.result']).toMatchObject({
      value: 'Nein',
      tone: 'danger',
      note: 'Hubarbeitsbühne',
    })
    expect(rows['tree.species']!.value).toBe('Berg-Ahorn (Acer pseudoplatanus)')
    expect(rows['tree.height']!.value).toBe('18,5 m')
    expect(rows['tree.photos']!.value).toBe('2 Fotos (im Anhang)')
    expect(rows['job.date']!.value).toBe('09.11.2026')
    expect(rows['team.members']!.value).toBe('Anna Ast – Aufsicht, Bodenperson')
    expect(rows['site.gps']!.value).toBe('50.100000, 8.600000 (± 5 m)')
  })

  it('signature place from address, else coordinates', () => {
    const input = validInput(def)
    const a = assessmentFrom(input)
    a.answers['site.address'] = { value: 'Lindenstraße 4\n60311 Frankfurt' }
    expect(signaturePlace({ assessment: a })).toBe('Lindenstraße 4')
    delete a.answers['site.address']
    expect(signaturePlace({ assessment: a })).toBe('50.100000, 8.600000')
  })
})
