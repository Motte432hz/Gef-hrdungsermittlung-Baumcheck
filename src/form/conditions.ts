import type { AnswerValue } from '../domain/types'
import type { Condition } from './schema'

/** Looks up an answer value by item id (tree answers first, then assessment answers). */
export type ValueLookup = (field: string) => AnswerValue | undefined

const asArray = (v: AnswerValue | undefined): unknown[] =>
  Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]

export function evaluateCondition(condition: Condition | undefined, lookup: ValueLookup): boolean {
  if (!condition) return true
  if ('all' in condition) return condition.all.every((c) => evaluateCondition(c, lookup))
  if ('any' in condition) return condition.any.some((c) => evaluateCondition(c, lookup))
  if ('not' in condition) return !evaluateCondition(condition.not, lookup)
  const value = lookup(condition.field)
  if ('equals' in condition) return value === condition.equals
  if ('includes' in condition) return asArray(value).includes(condition.includes)
  if ('includesAny' in condition) {
    const values = asArray(value)
    return condition.includesAny.some((v) => values.includes(v))
  }
  return true
}

/** Field ids referenced by a condition (for definition checks). */
export function conditionFields(condition: Condition | undefined): string[] {
  if (!condition) return []
  if ('all' in condition) return condition.all.flatMap(conditionFields)
  if ('any' in condition) return condition.any.flatMap(conditionFields)
  if ('not' in condition) return conditionFields(condition.not)
  return [condition.field]
}
