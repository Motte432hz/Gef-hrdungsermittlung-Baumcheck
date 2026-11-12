/**
 * Form definition schema. The assessment form is data (JSON), not hard-coded UI,
 * so texts can be revised and customers can add their own items later (phase 3).
 * Both the wizard and the PDF are rendered from definition + answers.
 */

/** Conditions reference answers by item id; tree items may reference assessment-level items. */
export type Condition =
  | { field: string; equals: string | number | boolean }
  | { field: string; includes: string }
  | { field: string; includesAny: string[] }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }

export type Severity = 'info' | 'warning' | 'danger'

interface ItemBase {
  /** Stable id, used as answer key. Never rename once released. */
  id: string
  label: string
  /** Explanation behind the (i) button. */
  info?: string
  visibleIf?: Condition
  /** Needed to complete the protocol. Checkpoints and hazards are always required. */
  required?: boolean
  /** Not in the original SVLFG form; proposed addition awaiting confirmation. */
  proposal?: boolean
}

/** Control point: yes / no / not relevant. "No" → warning + required measure. */
export interface CheckpointItem extends ItemBase {
  type: 'checkpoint'
  /** Typical measures offered as quick picks when the answer is "no". */
  measures?: string[]
  /** Default true. */
  allowNotRelevant?: boolean
}

/** Hazard feature: present / not present. "Present" → required measure. */
export interface HazardItem extends ItemBase {
  type: 'hazard'
  /** Typical measures offered as quick picks when the hazard is present. */
  measures?: string[]
}

export interface ChoiceOption {
  value: string
  label: string
  info?: string
  /** Shown when this option is selected. */
  warning?: string
  severity?: Severity
  /** Selecting this option requires a note (reason / measure). */
  requiresNote?: boolean
  noteLabel?: string
  /** Typical measures offered as quick picks for the required note. */
  measures?: string[]
  /** Option with free text ("Sonstiges"). */
  isOther?: boolean
}

export interface ChoiceItem extends ItemBase {
  type: 'single' | 'multi'
  options: ChoiceOption[]
}

export interface TextItem extends ItemBase {
  type: 'text'
  multiline?: boolean
  placeholder?: string
}

export interface NumberItem extends ItemBase {
  type: 'number'
  unit?: string
  min?: number
  max?: number
  step?: number
}

export interface TimeItem extends ItemBase {
  type: 'time'
}

/** Items with dedicated widgets, stored in assessment fields rather than in answers. */
export interface SpecialItem extends ItemBase {
  type: 'customer' | 'date' | 'supervisor' | 'gps' | 'address' | 'team' | 'photos' | 'treeSpecies'
}

export type FormItem =
  CheckpointItem | HazardItem | ChoiceItem | TextItem | NumberItem | TimeItem | SpecialItem

export type AnsweredItemType = Exclude<FormItem['type'], SpecialItem['type']>

/**
 * Filter question for a section of hazard features: "keine Auffälligkeiten" covers all
 * hazards of the section at once; "Auffälligkeiten vorhanden" shows them one by one.
 */
export interface SectionGate {
  /** Answer key, e.g. "tree.crown.gate". */
  id: string
  label: string
  info?: string
}

export const GATE_NONE = 'none'
export const GATE_SOME = 'some'

export interface FormSection {
  id: string
  title?: string
  gate?: SectionGate
  items: FormItem[]
}

/** Hazard items of a gated section are hidden/implied unless the gate says "some". */
export function isGatedOut(section: FormSection, item: FormItem, gateValue: unknown): boolean {
  return !!section.gate && item.type === 'hazard' && gateValue !== GATE_SOME
}

export interface FormStep {
  id: string
  title: string
  /** For step navigation on small screens. */
  shortTitle: string
  intro?: string
  /** Repeated per tree; answers live on the tree record. */
  repeat?: 'tree'
  sections: FormSection[]
}

export interface FormDefinition {
  id: string
  version: string
  status: 'draft' | 'released'
  title: string
  steps: FormStep[]
  statements: {
    supervisor: string
    member: string
  }
  /** Default labels for the measure field. */
  noteLabels: {
    checkpoint: string
    hazard: string
  }
}

export const SPECIAL_TYPES = new Set<FormItem['type']>([
  'customer',
  'date',
  'supervisor',
  'gps',
  'address',
  'team',
  'photos',
  'treeSpecies',
])

export function isSpecialItem(item: FormItem): item is SpecialItem {
  return SPECIAL_TYPES.has(item.type)
}
