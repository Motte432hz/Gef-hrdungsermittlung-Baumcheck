import { useState } from 'react'
import type { Answer } from '../domain/types'
import type { FormItem } from '../form/schema'
import { useWizard } from './WizardContext'
import { itemAnchor } from './anchors'
import { OPEN_ATTR, scrollToNextOpen } from './nextOpen'
import { CollapsedItem } from './inputs/CollapsedItem'
import { HospitalAssist } from './assist/HospitalAssist'
import { WeatherAssist } from './assist/WeatherAssist'
import { CheckpointField, HazardField } from './inputs/RatedFields'
import { ChoiceField } from './inputs/ChoiceField'
import { NumberItemField, TextItemField, TimeItemField } from './inputs/SimpleFields'
import { CustomerField } from './special/CustomerField'
import { DateField } from './special/DateField'
import { SupervisorField } from './special/SupervisorField'
import { TeamField } from './special/TeamField'
import { AddressField, GpsField } from './special/LocationFields'
import { SpeciesField } from './trees/SpeciesField'
import { PhotosField } from './trees/PhotosField'

export function ItemField({ item, treeId }: { item: FormItem; treeId?: string }) {
  const { definition, assessment, trees, setAnswer } = useWizard()
  const answers = treeId ? (trees.find((t) => t.id === treeId)?.answers ?? {}) : assessment.answers
  const answer = answers[item.id]
  const anchor = itemAnchor(item.id, treeId)
  const [expanded, setExpanded] = useState(false)
  const onChange = (a: Answer | undefined) => {
    setExpanded(false)
    void setAnswer(item.id, a, treeId).then(() => {
      if (okText(item, a)) scrollToNextOpen(anchor)
    })
  }

  const ok = okText(item, answer)
  if (ok && !expanded) {
    return (
      <div id={anchor} className="scroll-mt-40">
        <CollapsedItem label={item.label} value={ok} onExpand={() => setExpanded(true)} />
      </div>
    )
  }

  const field = (() => {
    switch (item.type) {
      case 'checkpoint':
        return (
          <CheckpointField
            item={item}
            answer={answer}
            noteLabel={definition.noteLabels.checkpoint}
            onChange={onChange}
          />
        )
      case 'hazard':
        return (
          <HazardField
            item={item}
            answer={answer}
            noteLabel={definition.noteLabels.hazard}
            onChange={onChange}
          />
        )
      case 'single':
      case 'multi':
        return <ChoiceField item={item} answer={answer} onChange={onChange} />
      case 'text':
        return <TextItemField item={item} answer={answer} onChange={onChange} />
      case 'number':
        return <NumberItemField item={item} answer={answer} onChange={onChange} />
      case 'time':
        return <TimeItemField item={item} answer={answer} onChange={onChange} />
      case 'customer':
        return <CustomerField item={item} />
      case 'date':
        return <DateField item={item} />
      case 'supervisor':
        return <SupervisorField item={item} />
      case 'team':
        return <TeamField item={item} />
      case 'address':
        return <AddressField item={item} />
      case 'gps':
        return <GpsField item={item} />
      case 'photos':
        return treeId ? <PhotosField item={item} treeId={treeId} /> : null
      case 'treeSpecies':
        return treeId ? <SpeciesField item={item} treeId={treeId} /> : null
    }
  })()

  const isOpen =
    answer === undefined || !!answer.prefilled
      ? ['checkpoint', 'hazard', 'single'].includes(item.type)
      : false
  return (
    <div id={anchor} className="scroll-mt-40" {...(isOpen ? { [OPEN_ATTR]: '' } : {})}>
      {field}
      {item.assist && (
        <div className="mt-2 rounded-2xl border border-dashed border-stone-300 p-3 dark:border-stone-700">
          {item.assist === 'hospital' ? (
            <HospitalAssist itemId={item.id} treeId={treeId} />
          ) : (
            <WeatherAssist />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Display text when the item is answered without any finding (it can then be collapsed);
 * undefined while it is open, prefilled or shows a deviation.
 */
function okText(item: FormItem, answer: Answer | undefined): string | undefined {
  if (!answer || answer.prefilled) return undefined
  if (item.type === 'checkpoint') {
    if (answer.value === 'yes') return 'Ja'
    if (answer.value === 'na') return 'n. r.'
  }
  if (item.type === 'hazard' && answer.value === 'absent') return 'nicht vorhanden'
  return undefined
}
