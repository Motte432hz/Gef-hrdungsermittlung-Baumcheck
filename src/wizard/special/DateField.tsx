import { useId } from 'react'
import type { SpecialItem } from '../../form/schema'
import { useWizard } from '../WizardContext'
import { ItemLabel } from '../inputs/InfoButton'
import { ItemCard } from '../inputs/ItemCard'
import { selectClass } from './selectClass'

export function DateField({ item }: { item: SpecialItem }) {
  const { assessment, update } = useWizard()
  const id = useId()
  return (
    <ItemCard>
      <ItemLabel
        as="label"
        htmlFor={id}
        label={item.label}
        info={item.info}
        required={item.required}
      />
      <input
        id={id}
        type="date"
        className={`${selectClass} max-w-56`}
        value={assessment.date}
        onChange={(e) => e.target.value && void update({ date: e.target.value })}
      />
    </ItemCard>
  )
}
