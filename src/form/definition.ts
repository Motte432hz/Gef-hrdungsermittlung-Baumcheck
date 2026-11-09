import raw from './definitions/baumcheck-1.0.json'
import type { FormDefinition, FormItem, FormStep } from './schema'
import { isSpecialItem, SPECIAL_TYPES } from './schema'
import { conditionFields } from './conditions'

export const currentDefinition = raw as FormDefinition

const definitions: Record<string, FormDefinition> = {
  [currentDefinition.version]: currentDefinition,
}

/** Returns the definition an assessment was created with (old protocols keep their version). */
export function getDefinition(version: string): FormDefinition {
  const def = definitions[version]
  if (!def) throw new Error(`Unknown form version ${version}`)
  return def
}

export interface LocatedItem {
  item: FormItem
  step: FormStep
  sectionId: string
}

export function allItems(def: FormDefinition): LocatedItem[] {
  return def.steps.flatMap((step) =>
    step.sections.flatMap((section) =>
      section.items.map((item) => ({ item, step, sectionId: section.id })),
    ),
  )
}

export function findItem(def: FormDefinition, id: string): LocatedItem | undefined {
  return allItems(def).find((l) => l.item.id === id)
}

const KNOWN_TYPES = new Set([
  'checkpoint',
  'hazard',
  'single',
  'multi',
  'text',
  'number',
  'time',
  ...SPECIAL_TYPES,
])

/** Structural checks for a definition. Returns a list of problems (empty = valid). */
export function checkDefinition(def: FormDefinition): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  const stepIds = new Set<string>()
  const located = allItems(def)

  for (const step of def.steps) {
    if (stepIds.has(step.id)) problems.push(`Duplicate step id ${step.id}`)
    stepIds.add(step.id)
  }

  for (const { item, step } of located) {
    if (ids.has(item.id)) problems.push(`Duplicate item id ${item.id}`)
    ids.add(item.id)
    if (!KNOWN_TYPES.has(item.type)) problems.push(`${item.id}: unknown type ${item.type}`)
    if (!item.label.trim()) problems.push(`${item.id}: empty label`)
    if (step.repeat === 'tree' && !item.id.startsWith('tree.')) {
      problems.push(`${item.id}: items in tree steps must start with "tree."`)
    }
    if (item.type === 'single' || item.type === 'multi') {
      const values = item.options.map((o) => o.value)
      if (new Set(values).size !== values.length) problems.push(`${item.id}: duplicate option`)
      if (values.length < 2) problems.push(`${item.id}: needs at least two options`)
    }
    if (isSpecialItem(item) && item.visibleIf)
      problems.push(`${item.id}: special items cannot be conditional`)
  }

  const answerable = new Map(located.map((l) => [l.item.id, l]))
  for (const { item, step } of located) {
    for (const field of conditionFields(item.visibleIf)) {
      const target = answerable.get(field)
      if (!target) problems.push(`${item.id}: condition references unknown item ${field}`)
      else if (target.step.repeat === 'tree' && step.repeat !== 'tree') {
        problems.push(`${item.id}: assessment item cannot depend on tree item ${field}`)
      }
    }
  }
  return problems
}
