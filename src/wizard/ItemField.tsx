import type { FormItem } from '../form/schema'
import { useWizard } from './WizardContext'
import { itemAnchor } from './anchors'
import { CheckpointField, HazardField } from './inputs/RatedFields'
import { ChoiceField } from './inputs/ChoiceField'
import { NumberItemField, TextItemField, TimeItemField } from './inputs/SimpleFields'
import { CustomerField } from './special/CustomerField'
import { DateField } from './special/DateField'
import { SupervisorField } from './special/SupervisorField'
import { TeamField } from './special/TeamField'
import { AddressField, GpsField } from './special/LocationFields'

export function ItemField({ item, treeId }: { item: FormItem; treeId?: string }) {
  const { definition, assessment, trees, setAnswer } = useWizard()
  const answers = treeId ? (trees.find((t) => t.id === treeId)?.answers ?? {}) : assessment.answers
  const answer = answers[item.id]
  const onChange = (a: Parameters<typeof setAnswer>[1]) => void setAnswer(item.id, a, treeId)

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
      case 'treeSpecies':
        return null
    }
  })()

  return (
    <div id={itemAnchor(item.id, treeId)} className="scroll-mt-40">
      {field}
    </div>
  )
}
