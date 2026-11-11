import type { Answers, TeamMember } from '../domain/types'
import type { FormDefinition, FormItem } from '../form/schema'
import type { ValidationInput } from '../form/validation'

/** Harmless default answer for an item (no warnings). */
function defaultAnswer(item: FormItem): Answers[string] | undefined {
  switch (item.type) {
    case 'checkpoint':
      return { value: 'yes' }
    case 'hazard':
      return { value: 'absent' }
    case 'single': {
      const o = item.options.find((x) => !x.warning && !x.requiresNote && !x.isOther)!
      return { value: o.value }
    }
    case 'multi': {
      const o = item.options.find((x) => !x.warning && !x.requiresNote && !x.isOther)!
      return { value: [o.value] }
    }
    case 'number':
      return { value: item.min !== undefined ? item.min + 10 : 10 }
    case 'time':
      return { value: item.id.endsWith('From') ? '08:00' : '16:00' }
    case 'text':
    case 'address':
    case 'treeSpecies':
      return { value: 'Test' }
    default:
      return undefined
  }
}

export function fillAnswers(def: FormDefinition, scope: 'assessment' | 'tree'): Answers {
  const answers: Answers = {}
  for (const step of def.steps) {
    if ((step.repeat === 'tree') !== (scope === 'tree')) continue
    for (const section of step.sections) {
      // Gates open, so every hazard is answered and tests can flip single hazards.
      if (section.gate) answers[section.gate.id] = { value: 'some' }
      for (const item of section.items) {
        // Conditional items stay unanswered, so tests can check that they appear when triggered.
        if (item.visibleIf) continue
        const a = defaultAnswer(item)
        if (a) answers[item.id] = a
      }
    }
  }
  return answers
}

export const member = (over: Partial<TeamMember> = {}): TeamMember => ({
  id: over.id ?? crypto.randomUUID(),
  kind: 'employee',
  name: 'Anna Ast',
  qualifications: [],
  roles: ['supervisor'],
  ...over,
})

/** A complete, valid assessment without any warnings. */
export function validInput(def: FormDefinition): ValidationInput {
  const sup = member({ id: 'm1', name: 'Anna Ast', roles: ['supervisor', 'ground'] })
  return {
    definition: def,
    assessment: {
      answers: { ...fillAnswers(def, 'assessment'), 'job.types': { value: ['tree_work'] } },
      team: [sup],
      supervisorMemberId: sup.id,
      date: '2026-11-09',
      position: { lat: 50.1, lng: 8.6, accuracy: 5, capturedAt: '2026-11-09T08:00:00Z' },
    },
    trees: [{ id: 't1', index: 0, answers: fillAnswers(def, 'tree') }],
  }
}
