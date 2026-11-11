import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { getDefaultEquipmentPreset, saveDefaultEquipmentPreset } from '../../db/profiles'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/Card'
import { Segmented } from '../../components/form/Segmented'
import { SaveStatus } from '../../components/SaveStatus'
import { useAutosave } from '../../components/useAutosave'
import { equipmentItems } from './equipmentItems'
import type { Condition } from '../../form/schema'

type PresetValue = 'yes' | 'no' | 'na' | 'none'

/** Human readable hint for conditional items. */
function conditionHint(c: Condition | undefined): string | undefined {
  if (!c) return undefined
  const s = JSON.stringify(c)
  if (s.includes('rope_access') && s.includes('aerial_platform'))
    return 'Nur bei SKT oder Hubarbeitsbühne'
  if (s.includes('rope_access')) return 'Nur bei Seilklettertechnik'
  if (s.includes('riggingRequired') || s.includes('felling_rigging'))
    return 'Nur wenn abgeseilt wird'
  return 'Nur bei bestimmten Einsätzen'
}

export function EquipmentPage() {
  const org = useOrganization()
  const [initial, setInitial] = useState<Record<string, PresetValue>>()

  useEffect(() => {
    if (!org || initial) return
    void getDefaultEquipmentPreset(db, org.id).then((p) => {
      const v: Record<string, PresetValue> = {}
      for (const item of equipmentItems) v[item.id] = (p?.answers[item.id] as PresetValue) ?? 'none'
      setInitial(v)
    })
  }, [org, initial])

  if (!org || !initial) return <p>Lädt …</p>
  return <EquipmentForm orgId={org.id} initial={initial} />
}

function EquipmentForm({
  orgId,
  initial,
}: {
  orgId: string
  initial: Record<string, PresetValue>
}) {
  const [values, setValues] = useState(initial)
  const state = useAutosave(
    values,
    async (v) => {
      const answers: Record<string, string> = {}
      for (const [id, x] of Object.entries(v)) if (x !== 'none') answers[id] = x
      await saveDefaultEquipmentPreset(db, orgId, answers)
    },
    { enabled: true },
  )

  const setAll = (v: PresetValue) =>
    setValues(Object.fromEntries(equipmentItems.map((i) => [i.id, v])))

  return (
    <div>
      <PageHeader title="Standard-Ausrüstung" back="/profile/firma" backLabel="Firma" />
      <div className="space-y-4">
        <Card>
          <p className="text-stone-700 dark:text-stone-300">
            Diese Antworten werden bei jedem neuen Einsatz vorbelegt. Vor Ort muss die Aufsicht sie
            trotzdem prüfen und bestätigen.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-12 rounded-xl px-3 font-semibold text-brand-700 underline dark:text-brand-300"
              onClick={() => setAll('yes')}
            >
              Alle auf „Ja“
            </button>
            <button
              type="button"
              className="min-h-12 rounded-xl px-3 font-semibold text-brand-700 underline dark:text-brand-300"
              onClick={() => setAll('none')}
            >
              Alle zurücksetzen
            </button>
          </div>
        </Card>
        <Card>
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {equipmentItems.map((item) => {
              const hint = conditionHint(item.visibleIf)
              const options = [
                { value: 'yes' as const, label: 'Ja' },
                ...(item.allowNotRelevant === false
                  ? []
                  : [{ value: 'na' as const, label: 'n. r.' }]),
                { value: 'none' as const, label: 'leer' },
              ]
              return (
                <li key={item.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                  <p className="font-semibold">{item.label}</p>
                  {hint && <p className="text-sm text-stone-600 dark:text-stone-400">{hint}</p>}
                  <Segmented<PresetValue>
                    label={item.label}
                    options={options}
                    value={values[item.id]}
                    onChange={(v) => setValues((x) => ({ ...x, [item.id]: v }))}
                    tones={{ na: 'muted', none: 'muted' }}
                  />
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
      <SaveStatus state={state} />
    </div>
  )
}
