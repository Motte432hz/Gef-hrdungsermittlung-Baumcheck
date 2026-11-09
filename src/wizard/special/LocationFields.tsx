import type { SpecialItem } from '../../form/schema'
import { useWizard } from '../WizardContext'
import { ItemCard } from '../inputs/ItemCard'
import { ItemLabel } from '../inputs/InfoButton'
import { TextItemField } from '../inputs/SimpleFields'

export function AddressField({ item }: { item: SpecialItem }) {
  const { assessment, setAnswer } = useWizard()
  return (
    <TextItemField
      item={{
        ...item,
        type: 'text',
        multiline: true,
        placeholder: 'Straße, PLZ Ort oder Beschreibung',
      }}
      answer={assessment.answers[item.id]}
      onChange={(a) => void setAnswer(item.id, a)}
    />
  )
}

/** GPS capture follows in milestone 5. */
export function GpsField({ item }: { item: SpecialItem }) {
  return (
    <ItemCard>
      <ItemLabel label={item.label} info={item.info} />
      <p className="text-stone-600 dark:text-stone-400">
        Die GPS-Bestimmung kommt im nächsten Ausbauschritt.
      </p>
    </ItemCard>
  )
}
