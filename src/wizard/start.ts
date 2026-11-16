import type { BaumCheckDB } from '../db/db'
import { createAssessment } from '../db/repo'
import { getDefaultEquipmentPreset } from '../db/profiles'
import { currentDefinition } from '../form/definition'
import { applyPreset } from '../form/validation'
import { equipmentItems } from '../pages/profiles/equipmentItems'
import type { Answers, Assessment, ID } from '../domain/types'

/** New draft with the organization's equipment preset applied (marked as prefilled). */
export async function startAssessment(
  db: BaumCheckDB,
  organizationId: ID,
  options: { practice?: boolean } = {},
): Promise<Assessment> {
  const preset = await getDefaultEquipmentPreset(db, organizationId)
  // Only items that still exist in the form (presets may hold removed items).
  const known = new Set(equipmentItems.map((i) => i.id))
  const values = Object.fromEntries(
    Object.entries(preset?.answers ?? {}).filter(([id]) => known.has(id)),
  )
  const answers = applyPreset({}, values)
  if (!options.practice)
    return createAssessment(db, organizationId, currentDefinition.version, { answers })
  return createAssessment(db, organizationId, currentDefinition.version, {
    answers: { ...answers, ...PRACTICE_ANSWERS },
    practice: true,
  })
}

/** A few answers to start the practice run with, so it looks like a real job. */
const PRACTICE_ANSWERS: Answers = {
  'job.types': { value: ['tree_work'] },
  'work.types': { value: ['crown_maintenance'] },
  'site.rescueAccess': {
    value: 'Übung: Zufahrt über den Parkplatz, Rettungswagen kommt bis 20 m an den Baum heran.',
  },
}
