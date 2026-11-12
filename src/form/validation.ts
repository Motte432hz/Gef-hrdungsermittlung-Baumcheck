import type { Answer, Answers, Assessment, Tree } from '../domain/types'
import { evaluateCondition, type ValueLookup } from './conditions'
import type { ChoiceOption, FormDefinition, FormItem, FormSection, FormStep } from './schema'
import { isGatedOut } from './schema'
import { checkTeam } from './plausibility'
import { getSpecies } from './species'

/** Derived field for conditions: "laub" or "nadel" from the chosen tree species. */
export const SPECIES_GROUP_FIELD = 'tree.species.group'
/** Derived field for conditions: "nesting" from 1 March to 30 September (§ 39 BNatSchG). */
export const SEASON_FIELD = 'job.season'

/** Closed season for cutting trees (1 March – 30 September), from a YYYY-MM-DD date. */
export const isNestingSeason = (date: string) => {
  const md = date.slice(5, 10)
  return md >= '03-01' && md <= '09-30'
}

/**
 * blocking = must be fixed before the protocol can be completed
 * danger / warning = shown highlighted, completion still possible
 * info = hint
 */
export type IssueLevel = 'blocking' | 'danger' | 'warning' | 'info'

export interface Issue {
  key: string
  level: IssueLevel
  stepId: string
  itemId?: string
  treeId?: string
  /** 0-based tree index for display ("Baum 2"). */
  treeIndex?: number
  message: string
}

export type ValidationAssessment = Pick<
  Assessment,
  'answers' | 'team' | 'supervisorMemberId' | 'date' | 'position'
>
export type ValidationTree = Pick<Tree, 'id' | 'index' | 'answers'>

export interface ValidationInput {
  definition: FormDefinition
  assessment: ValidationAssessment
  trees: ValidationTree[]
}

export const GPS_ACCURACY_LIMIT_M = 30

const isEmpty = (v: unknown) =>
  v === undefined ||
  v === null ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0)

const hasNote = (a: Answer | undefined) => !!a?.note && a.note.trim() !== ''

export function makeLookup(
  assessmentAnswers: Answers,
  treeAnswers?: Answers,
  /** Date of the job (YYYY-MM-DD), for date-based conditions. */
  date?: string,
): ValueLookup {
  return (field) => {
    if (field === SEASON_FIELD)
      return date ? (isNestingSeason(date) ? 'nesting' : 'outside') : undefined
    if (field === SPECIES_GROUP_FIELD) {
      const id = treeAnswers?.['tree.species']?.value
      return getSpecies(typeof id === 'string' ? id : undefined)?.group
    }
    return (treeAnswers?.[field] ?? assessmentAnswers[field])?.value
  }
}

export function isItemVisible(item: FormItem, lookup: ValueLookup): boolean {
  return evaluateCondition(item.visibleIf, lookup)
}

/** Options selected in a single/multi answer. */
export function selectedOptions(item: FormItem, answer: Answer | undefined): ChoiceOption[] {
  if ((item.type !== 'single' && item.type !== 'multi') || !answer) return []
  const values = Array.isArray(answer.value) ? answer.value : [answer.value]
  return item.options.filter((o) => values.includes(o.value))
}

interface ItemScope {
  step: FormStep
  answers: Answers
  assessment: ValidationAssessment
  tree?: ValidationTree
}

function issue(
  scope: ItemScope,
  item: FormItem,
  level: IssueLevel,
  kind: string,
  message: string,
): Issue {
  return {
    key: `${scope.tree ? `${scope.tree.id}:` : ''}${item.id}:${kind}`,
    level,
    stepId: scope.step.id,
    itemId: item.id,
    treeId: scope.tree?.id,
    treeIndex: scope.tree?.index,
    message,
  }
}

function validateItem(def: FormDefinition, item: FormItem, scope: ItemScope): Issue[] {
  const out: Issue[] = []
  const answer = scope.answers[item.id]
  const missing = (msg = `„${item.label}“ ist noch nicht ausgefüllt.`) =>
    out.push(issue(scope, item, 'blocking', 'missing', msg))

  if (answer?.prefilled) {
    out.push(
      issue(
        scope,
        item,
        'blocking',
        'prefilled',
        `Vorbelegt, noch nicht vor Ort bestätigt: ${item.label}`,
      ),
    )
  }

  switch (item.type) {
    case 'checkpoint': {
      const v = answer?.value
      if (v !== 'yes' && v !== 'no' && v !== 'na') {
        missing(`„${item.label}“ ist noch nicht beantwortet.`)
      } else if (v === 'na' && item.allowNotRelevant === false) {
        out.push(
          issue(scope, item, 'blocking', 'na', `„${item.label}“ kann nicht „nicht relevant“ sein.`),
        )
      } else if (v === 'no') {
        out.push(issue(scope, item, 'warning', 'no', `Nicht erfüllt: ${item.label}`))
        if (!hasNote(answer)) {
          out.push(
            issue(
              scope,
              item,
              'blocking',
              'note',
              `${def.noteLabels.checkpoint} fehlt: ${item.label}`,
            ),
          )
        }
      }
      break
    }
    case 'hazard': {
      const v = answer?.value
      if (v !== 'present' && v !== 'absent') {
        missing(`„${item.label}“ ist noch nicht beantwortet.`)
      } else if (v === 'present' && !hasNote(answer)) {
        out.push(
          issue(scope, item, 'blocking', 'note', `${def.noteLabels.hazard} fehlt: ${item.label}`),
        )
      }
      break
    }
    case 'single':
    case 'multi': {
      const selected = selectedOptions(item, answer)
      if (selected.length === 0) {
        if (item.required) missing()
        break
      }
      for (const option of selected) {
        if (option.warning) {
          const level: IssueLevel =
            option.severity === 'danger' ? 'danger' : (option.severity ?? 'warning')
          out.push(issue(scope, item, level, `option:${option.value}`, option.warning))
        }
        if (option.requiresNote && !hasNote(answer)) {
          out.push(
            issue(
              scope,
              item,
              'blocking',
              `note:${option.value}`,
              `${option.noteLabel ?? 'Begründung'} fehlt: ${item.label} – ${option.label}`,
            ),
          )
        }
        if (option.isOther && isEmpty(answer?.otherText)) {
          out.push(
            issue(
              scope,
              item,
              'blocking',
              'other',
              `Bitte „${option.label}“ bei „${item.label}“ beschreiben.`,
            ),
          )
        }
      }
      break
    }
    case 'number': {
      const v = answer?.value
      if (v === undefined || v === null || v === '') {
        if (item.required) missing()
      } else if (typeof v !== 'number' || !Number.isFinite(v)) {
        out.push(
          issue(scope, item, 'blocking', 'invalid', `„${item.label}“ ist keine gültige Zahl.`),
        )
      } else if (
        (item.min !== undefined && v < item.min) ||
        (item.max !== undefined && v > item.max)
      ) {
        out.push(
          issue(
            scope,
            item,
            'blocking',
            'range',
            `„${item.label}“ muss zwischen ${item.min ?? '–'} und ${item.max ?? '–'} ${item.unit ?? ''} liegen.`.trim(),
          ),
        )
      }
      break
    }
    case 'text':
    case 'time':
    case 'address': {
      if (item.required && isEmpty(answer?.value)) missing()
      break
    }
    case 'treeSpecies': {
      // "other" needs the free-text name.
      const v = answer?.value === 'other' ? answer.otherText : answer?.value
      if (item.required && isEmpty(v)) missing()
      break
    }
    case 'date': {
      if (item.required && isEmpty(scope.assessment.date)) missing()
      break
    }
    case 'team': {
      if (item.required && scope.assessment.team.length === 0) {
        missing('Es ist noch keine Person im Team eingetragen.')
      }
      break
    }
    case 'supervisor': {
      const ok = scope.assessment.team.some((m) => m.id === scope.assessment.supervisorMemberId)
      if (item.required && !ok) missing('Es ist keine aufsichtsführende Person ausgewählt.')
      break
    }
    case 'gps': {
      if (!scope.assessment.position) {
        out.push(
          issue(
            scope,
            item,
            'info',
            'none',
            'Keine GPS-Position erfasst. Für den Notruf wird sie dringend empfohlen.',
          ),
        )
        break
      }
      const acc = scope.assessment.position?.accuracy
      if (acc !== undefined && acc > GPS_ACCURACY_LIMIT_M) {
        out.push(
          issue(
            scope,
            item,
            'info',
            'accuracy',
            `GPS-Position ist ungenau (± ${Math.round(acc)} m). Wenn möglich direkt am Baum neu bestimmen.`,
          ),
        )
      }
      break
    }
    case 'customer':
    case 'photos':
      break
  }
  return out
}

/** The filter question of a gated section must be answered. */
function validateGate(section: FormSection, scope: ItemScope): Issue[] {
  const gate = section.gate
  if (!gate) return []
  const a = scope.answers[gate.id]
  const v = a?.value
  if ((v === 'none' || v === 'some') && !a?.prefilled) return []
  return [
    {
      key: `${scope.tree ? `${scope.tree.id}:` : ''}${gate.id}:missing`,
      level: 'blocking',
      stepId: scope.step.id,
      itemId: gate.id,
      treeId: scope.tree?.id,
      treeIndex: scope.tree?.index,
      message: a?.prefilled
        ? `Vorbelegt, noch nicht vor Ort bestätigt: ${gate.label}`
        : `„${gate.label}“ ist noch nicht beantwortet.`,
    },
  ]
}

/** Validates the whole assessment. Order follows the wizard steps. */
export function validateAssessment({ definition, assessment, trees }: ValidationInput): Issue[] {
  const issues: Issue[] = []
  const sortedTrees = [...trees].sort((a, b) => a.index - b.index)

  for (const step of definition.steps) {
    if (step.repeat === 'tree') {
      if (sortedTrees.length === 0 && step === definition.steps.find((s) => s.repeat === 'tree')) {
        issues.push({
          key: 'trees:none',
          level: 'blocking',
          stepId: step.id,
          message: 'Es ist noch kein Baum erfasst.',
        })
      }
      for (const tree of sortedTrees) {
        const lookup = makeLookup(assessment.answers, tree.answers)
        for (const section of step.sections) {
          issues.push(...validateGate(section, { step, answers: tree.answers, assessment, tree }))
          for (const item of section.items) {
            if (!isItemVisible(item, lookup)) continue
            if (isGatedOut(section, item, tree.answers[section.gate?.id ?? '']?.value)) continue
            issues.push(
              ...validateItem(definition, item, { step, answers: tree.answers, assessment, tree }),
            )
          }
        }
      }
    } else {
      const lookup = makeLookup(assessment.answers, undefined, assessment.date)
      for (const section of step.sections) {
        issues.push(...validateGate(section, { step, answers: assessment.answers, assessment }))
        for (const item of section.items) {
          if (!isItemVisible(item, lookup)) continue
          if (isGatedOut(section, item, assessment.answers[section.gate?.id ?? '']?.value)) continue
          issues.push(
            ...validateItem(definition, item, { step, answers: assessment.answers, assessment }),
          )
        }
      }
      if (step.id === 'team') issues.push(...checkTeam(assessment, step.id))
      if (step.id === 'job') issues.push(...checkTimes(assessment.answers, step.id))
    }
  }
  return issues
}

function checkTimes(answers: Answers, stepId: string): Issue[] {
  const from = answers['job.timeFrom']?.value
  const to = answers['job.timeTo']?.value
  if (typeof from === 'string' && typeof to === 'string' && from && to && to <= from) {
    return [
      {
        key: 'job.time:order',
        level: 'warning',
        stepId,
        itemId: 'job.timeTo',
        message: 'Die Endzeit liegt vor der Startzeit.',
      },
    ]
  }
  return []
}

export function canComplete(issues: Issue[]): boolean {
  return !issues.some((i) => i.level === 'blocking')
}

export interface Finding {
  stepId: string
  itemId: string
  label: string
  treeId?: string
  treeIndex?: number
  kind: 'checkpoint_no' | 'hazard_present' | 'option'
  /** Option label for kind "option". */
  detail?: string
  note?: string
  severity: 'danger' | 'warning'
}

/** Hazards and deviations with their measures – highlighted in summary and PDF. */
export function collectFindings({ definition, assessment, trees }: ValidationInput): Finding[] {
  const out: Finding[] = []
  const visit = (step: FormStep, answers: Answers, lookup: ValueLookup, tree?: ValidationTree) => {
    for (const section of step.sections) {
      for (const item of section.items) {
        if (!isItemVisible(item, lookup)) continue
        if (isGatedOut(section, item, answers[section.gate?.id ?? '']?.value)) continue
        const a = answers[item.id]
        const base = {
          stepId: step.id,
          itemId: item.id,
          label: item.label,
          treeId: tree?.id,
          treeIndex: tree?.index,
          note: a?.note,
        }
        if (item.type === 'checkpoint' && a?.value === 'no') {
          out.push({ ...base, kind: 'checkpoint_no', severity: 'warning' })
        } else if (item.type === 'hazard' && a?.value === 'present') {
          out.push({ ...base, kind: 'hazard_present', severity: 'warning' })
        } else {
          for (const o of selectedOptions(item, a)) {
            if (o.warning) {
              out.push({
                ...base,
                kind: 'option',
                detail: o.label,
                severity: o.severity === 'danger' ? 'danger' : 'warning',
              })
            }
          }
        }
      }
    }
  }
  const sortedTrees = [...trees].sort((a, b) => a.index - b.index)
  for (const step of definition.steps) {
    if (step.repeat === 'tree') {
      for (const t of sortedTrees)
        visit(step, t.answers, makeLookup(assessment.answers, t.answers), t)
    } else {
      visit(step, assessment.answers, makeLookup(assessment.answers, undefined, assessment.date))
    }
  }
  return out
}

/** The answer without its "prefilled" marks (= confirmed). */
export function confirmed(a: Answer): Answer {
  const out = { ...a }
  delete out.prefilled
  delete out.prefilledFrom
  return out
}

/** Fills unanswered items from an equipment preset (marked as prefilled); existing answers are kept. */
export function applyPreset(answers: Answers, preset: Record<string, string>): Answers {
  const out = { ...answers }
  for (const [id, value] of Object.entries(preset)) {
    if (out[id] === undefined) out[id] = { value, prefilled: true }
  }
  return out
}
