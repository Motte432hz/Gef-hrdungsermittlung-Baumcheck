import { describe, expect, it } from 'vitest'
import { currentDefinition as def } from './definition'
import { applyPreset, canComplete, collectFindings, validateAssessment } from './validation'
import { validInput } from '../test/fixtures'

const levels = (input = validInput(def)) => validateAssessment(input)

describe('validateAssessment', () => {
  it('a fully answered assessment has no issues and can be completed', () => {
    const issues = levels()
    expect(issues).toEqual([])
    expect(canComplete(issues)).toBe(true)
  })

  it('unanswered checkpoint blocks completion', () => {
    const input = validInput(def)
    delete input.assessment.answers['team.briefed']
    const issues = validateAssessment(input)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ level: 'blocking', stepId: 'team', itemId: 'team.briefed' })
    expect(canComplete(issues)).toBe(false)
  })

  it('checkpoint "no" warns and requires a measure', () => {
    const input = validInput(def)
    input.assessment.answers['site.emergencyCallPossible'] = { value: 'no' }
    let issues = validateAssessment(input)
    expect(issues.map((i) => i.level).sort()).toEqual(['blocking', 'warning'])
    expect(issues.find((i) => i.level === 'blocking')!.message).toBe(
      'Maßnahme / Begründung fehlt: Notruf ist am Arbeitsplatz möglich (Mobilfunkempfang geprüft)',
    )

    input.assessment.answers['site.emergencyCallPossible'] = {
      value: 'no',
      note: 'Notruf von der Kreuzung 200 m nördlich',
    }
    issues = validateAssessment(input)
    expect(issues.map((i) => i.level)).toEqual(['warning'])
    expect(canComplete(issues)).toBe(true)
  })

  it('"not relevant" is rejected where the item always applies', () => {
    const input = validInput(def)
    input.assessment.answers['equip.ppeAvailable'] = { value: 'na' }
    expect(validateAssessment(input)[0]).toMatchObject({
      level: 'blocking',
      itemId: 'equip.ppeAvailable',
    })
  })

  it('hazard "present" requires a measure, but is not a warning once handled', () => {
    const input = validInput(def)
    input.trees[0]!.answers['tree.crown.deadwood'] = { value: 'present' }
    const issues = validateAssessment(input)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      level: 'blocking',
      treeId: 't1',
      treeIndex: 0,
      stepId: 'treeAssessment',
    })

    input.trees[0]!.answers['tree.crown.deadwood'] = {
      value: 'present',
      note: 'Totholz zuerst entnehmen',
    }
    expect(validateAssessment(input)).toEqual([])
  })

  it('tree result "unsafe" is a danger and requires a reason', () => {
    const input = validInput(def)
    input.trees[0]!.answers['tree.result'] = { value: 'unsafe' }
    let issues = validateAssessment(input)
    expect(issues.map((i) => i.level).sort()).toEqual(['blocking', 'danger'])
    expect(issues.find((i) => i.level === 'blocking')!.message).toContain(
      'Begründung / geändertes Vorgehen',
    )

    input.trees[0]!.answers['tree.result'] = {
      value: 'unsafe',
      note: 'Fällung mit Hubarbeitsbühne',
    }
    issues = validateAssessment(input)
    expect(issues.map((i) => i.level)).toEqual(['danger'])
    expect(canComplete(issues)).toBe(true)
  })

  it('tree result "investigate" is a warning and requires a reason', () => {
    const input = validInput(def)
    input.trees[0]!.answers['tree.result'] = { value: 'investigate' }
    expect(
      validateAssessment(input)
        .map((i) => i.level)
        .sort(),
    ).toEqual(['blocking', 'warning'])
  })

  it('"Sonstiges" requires a description', () => {
    const input = validInput(def)
    input.assessment.answers['work.types'] = { value: ['deadwood', 'other'] }
    expect(validateAssessment(input)[0]).toMatchObject({ level: 'blocking', itemId: 'work.types' })
    input.assessment.answers['work.types'] = {
      value: ['deadwood', 'other'],
      otherText: 'Efeu entfernen',
    }
    expect(validateAssessment(input)).toEqual([])
  })

  it('numbers are range-checked', () => {
    const input = validInput(def)
    input.trees[0]!.answers['tree.height'] = { value: 250 }
    expect(validateAssessment(input)[0]!.message).toBe(
      '„Baumhöhe“ muss zwischen 1 und 80 m liegen.',
    )
  })

  it('every tree is validated separately', () => {
    const input = validInput(def)
    input.trees.push({ id: 't2', index: 1, answers: {} })
    const issues = validateAssessment(input)
    // Gated hazards are not asked until their gate is answered.
    expect(issues.length).toBeGreaterThan(8)
    expect(issues.every((i) => i.treeId === 't2')).toBe(true)
    expect(issues.map((i) => i.itemId)).toEqual(
      expect.arrayContaining(['tree.env.gate', 'tree.trunk.gate', 'tree.crown.gate']),
    )
  })

  it('a gate answered "none" replaces all hazard questions of its section', () => {
    const input = validInput(def)
    const t = input.trees[0]!
    t.answers['tree.trunk.gate'] = { value: 'none' }
    for (const k of Object.keys(t.answers))
      if (k.startsWith('tree.trunk.') && k !== 'tree.trunk.gate') delete t.answers[k]
    expect(validateAssessment(input)).toEqual([])
  })

  it('a gate answered "some" asks every hazard of its section', () => {
    const input = validInput(def)
    delete input.assessment.answers['site.powerLines']
    expect(validateAssessment(input).map((i) => i.itemId)).toEqual(['site.powerLines'])
    input.assessment.answers['site.hazards.gate'] = { value: 'none' }
    expect(validateAssessment(input)).toEqual([])
  })

  it('a missing gate is a blocking issue', () => {
    const input = validInput(def)
    delete input.assessment.answers['site.hazards.gate']
    expect(validateAssessment(input)).toEqual([
      expect.objectContaining({ itemId: 'site.hazards.gate', level: 'blocking' }),
    ])
  })

  it('Roloff stage 3 is a danger and needs a measure', () => {
    const input = validInput(def)
    input.trees[0]!.answers['tree.crown.vitality'] = { value: '3' }
    expect(validateAssessment(input)).toEqual(
      expect.arrayContaining([expect.objectContaining({ itemId: 'tree.crown.vitality' })]),
    )
  })

  it('at least one tree is required', () => {
    const input = validInput(def)
    input.trees = []
    expect(validateAssessment(input)).toEqual([
      expect.objectContaining({ key: 'trees:none', level: 'blocking', stepId: 'tree' }),
    ])
  })

  it('SKT-only items appear only with rope access', () => {
    const input = validInput(def)
    input.assessment.answers['job.types'] = { value: ['rope_access'] }
    const ids = validateAssessment(input).map((i) => i.itemId)
    expect(ids).toEqual(
      expect.arrayContaining([
        'tree.crown.anchorOk',
        'equip.twoClimbingKits',
        'emergency.rescueRope',
      ]),
    )
  })

  it('escape route only for felling, rigging equipment only when rigging is needed', () => {
    const input = validInput(def)
    input.assessment.answers['work.types'] = { value: ['felling'] }
    input.assessment.answers['site.riggingRequired'] = {
      value: 'present',
      note: 'Abseilen über Garage',
    }
    const ids = validateAssessment(input).map((i) => i.itemId)
    expect(ids).toContain('site.escapeRoute')
    expect(ids).toContain('equip.riggingChecked')
  })

  it('supervisor must be a team member', () => {
    const input = validInput(def)
    input.assessment.supervisorMemberId = 'unknown'
    expect(validateAssessment(input)[0]).toMatchObject({
      level: 'blocking',
      itemId: 'job.supervisor',
    })
  })

  it('imprecise GPS is a hint, not blocking', () => {
    const input = validInput(def)
    input.assessment.position!.accuracy = 120
    const issues = validateAssessment(input)
    expect(issues).toEqual([expect.objectContaining({ level: 'info', itemId: 'site.gps' })])
    expect(issues[0]!.message).toContain('± 120 m')
  })

  it('"other" tree species needs a name', () => {
    const input = validInput(def)
    input.trees[0]!.answers['tree.species'] = { value: 'other' }
    expect(validateAssessment(input)[0]).toMatchObject({
      level: 'blocking',
      itemId: 'tree.species',
    })
    input.trees[0]!.answers['tree.species'] = { value: 'other', otherText: 'Mispel' }
    expect(validateAssessment(input)).toEqual([])
  })

  it('missing GPS position is a hint', () => {
    const input = validInput(def)
    input.assessment.position = undefined
    expect(validateAssessment(input)).toEqual([
      expect.objectContaining({ level: 'info', key: 'site.gps:none' }),
    ])
  })

  it('end time before start time is a warning', () => {
    const input = validInput(def)
    input.assessment.answers['job.timeTo'] = { value: '07:00' }
    expect(validateAssessment(input)).toEqual([
      expect.objectContaining({ level: 'warning', itemId: 'job.timeTo' }),
    ])
  })
})

describe('collectFindings', () => {
  it('lists hazards and deviations with their measures', () => {
    const input = validInput(def)
    input.assessment.answers['site.powerLines'] = {
      value: 'present',
      note: 'Netzbetreiber schaltet frei',
    }
    input.trees[0]!.answers['tree.growthForm'] = { value: 'tilted', note: 'Seilwinde' }
    input.assessment.answers['team.fitForWork'] = { value: 'no', note: 'Kollege bleibt am Boden' }
    const findings = collectFindings(input)
    expect(findings.map((f) => [f.itemId, f.kind, f.severity])).toEqual([
      ['team.fitForWork', 'checkpoint_no', 'warning'],
      ['tree.growthForm', 'option', 'danger'],
      ['site.powerLines', 'hazard_present', 'warning'],
    ])
    expect(findings[2]!.note).toBe('Netzbetreiber schaltet frei')
  })

  it('ignores hidden items', () => {
    const input = validInput(def)
    input.assessment.answers['equip.twoClimbingKits'] = { value: 'no', note: 'x' }
    expect(collectFindings(input)).toEqual([])
  })
})

describe('applyPreset', () => {
  it('fills only unanswered items', () => {
    const result = applyPreset(
      { 'equip.ppeAvailable': { value: 'no', note: 'Helm defekt' } },
      { 'equip.ppeAvailable': 'yes', 'equip.ppeChecked': 'yes' },
    )
    expect(result).toEqual({
      'equip.ppeAvailable': { value: 'no', note: 'Helm defekt' },
      'equip.ppeChecked': { value: 'yes', prefilled: true },
    })
  })

  it('prefilled answers must be confirmed on site', () => {
    const input = validInput(def)
    input.assessment.answers['equip.ppeChecked'] = { value: 'yes', prefilled: true }
    expect(validateAssessment(input)).toEqual([
      expect.objectContaining({
        level: 'blocking',
        itemId: 'equip.ppeChecked',
        key: 'equip.ppeChecked:prefilled',
      }),
    ])
  })
})
