import type { BaumCheckDB } from '../db/db'
import { createAssessment } from '../db/repo'
import { getDefaultEquipmentPreset } from '../db/profiles'
import { currentDefinition } from '../form/definition'
import { applyPreset } from '../form/validation'
import { equipmentItems } from '../pages/profiles/equipmentItems'
import type { Assessment, ID } from '../domain/types'

/** New draft with the organization's equipment preset applied (marked as prefilled). */
export async function startAssessment(db: BaumCheckDB, organizationId: ID): Promise<Assessment> {
  const preset = await getDefaultEquipmentPreset(db, organizationId)
  // Only items that still exist in the form (presets may hold removed items).
  const known = new Set(equipmentItems.map((i) => i.id))
  const values = Object.fromEntries(
    Object.entries(preset?.answers ?? {}).filter(([id]) => known.has(id)),
  )
  return createAssessment(db, organizationId, currentDefinition.version, {
    answers: applyPreset({}, values),
  })
}
