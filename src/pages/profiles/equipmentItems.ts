import { currentDefinition } from '../../form/definition'
import type { CheckpointItem } from '../../form/schema'

/** Checkpoints of the equipment and emergency sections – these can be preset per organization. */
export const equipmentItems: CheckpointItem[] = currentDefinition.steps
  .flatMap((s) => s.sections)
  .filter((sec) => sec.id.startsWith('equipment.'))
  .flatMap((sec) => sec.items)
  .filter((i): i is CheckpointItem => i.type === 'checkpoint')
