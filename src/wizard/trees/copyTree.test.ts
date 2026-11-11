import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../../db/db'
import { addTree, createAssessment, ensureOrganization, setTreeAnswers } from '../../db/repo'
import { currentDefinition as def } from '../../form/definition'
import { validateAssessment } from '../../form/validation'
import { addTreeLike } from './copyTree'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  await db.delete()
})

describe('addTreeLike', () => {
  it('copies basics as is and the assessment as prefilled; never number or remark', async () => {
    const org = await ensureOrganization(db, { name: 'Zwieselwiesel', numberPrefix: 'ZW' })
    const a = await createAssessment(db, org.id, '1.0')
    const t1 = await addTree(db, a.id)
    await setTreeAnswers(db, t1.id, {
      'tree.number': { value: '17' },
      'tree.species': { value: 'tilia-cordata' },
      'tree.height': { value: 18 },
      'tree.env.gate': { value: 'none' },
      'tree.crown.vitality': { value: '1' },
      'tree.result': { value: 'yes' },
      'tree.remark': { value: 'Nur bei Baum 1' },
    })
    const source = (await db.trees.get(t1.id))!
    const t2 = await addTreeLike(db, def, source)

    const copy = (await db.trees.get(t2.id))!
    expect(copy.index).toBe(1)
    expect(copy.answers['tree.number']).toBeUndefined()
    expect(copy.answers['tree.remark']).toBeUndefined()
    expect(copy.answers['tree.height']).toEqual({ value: 18 })
    expect(copy.answers['tree.env.gate']).toEqual({
      value: 'none',
      prefilled: true,
      prefilledFrom: 'Baum 1',
    })
    expect(copy.answers['tree.crown.vitality']?.prefilled).toBe(true)

    // Copied answers block completion until confirmed.
    const issues = validateAssessment({
      definition: def,
      assessment: (await db.assessments.get(a.id))!,
      trees: [source, copy],
    })
    expect(issues.map((i) => `${i.treeId === copy.id ? 'copy' : 'src'}:${i.itemId}`)).toEqual(
      expect.arrayContaining(['copy:tree.env.gate', 'copy:tree.crown.vitality']),
    )
    expect(
      issues.find((i) => i.treeId === copy.id && i.itemId === 'tree.env.gate')?.message,
    ).toMatch(/Vorbelegt/)
  })
})
