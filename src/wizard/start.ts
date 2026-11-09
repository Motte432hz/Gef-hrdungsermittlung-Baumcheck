import type { BaumCheckDB } from '../db/db'
import { createAssessment } from '../db/repo'
import { getDefaultEquipmentPreset } from '../db/profiles'
import { currentDefinition } from '../form/definition'
import { applyPreset } from '../form/validation'
import type { Assessment, ID } from '../domain/types'

/** New draft with the organization's equipment preset applied (marked as prefilled). */
export async function startAssessment(db: BaumCheckDB, organizationId: ID): Promise<Assessment> {
  const preset = await getDefaultEquipmentPreset(db, organizationId)
  return createAssessment(db, organizationId, currentDefinition.version, {
    answers: applyPreset({}, preset?.answers ?? {}),
  })
}
