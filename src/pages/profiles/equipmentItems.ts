import { currentDefinition } from '../../form/definition'
import type { CheckpointItem } from '../../form/schema'

/** Checkpoints of the "Ausrüstung & Notfall" step – these can be preset per organization. */
export const equipmentItems: CheckpointItem[] = currentDefinition.steps
  .filter((s) => s.id === 'equipment')
  .flatMap((s) => s.sections.flatMap((sec) => sec.items))
  .filter((i): i is CheckpointItem => i.type === 'checkpoint')
