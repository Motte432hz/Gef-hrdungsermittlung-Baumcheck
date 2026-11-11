import type { Answer } from '../../domain/types'
import type { CheckpointItem, HazardItem } from '../../form/schema'
import { Segmented } from '../../components/form/Segmented'
import { ItemLabel } from './InfoButton'
import { ItemCard, PrefilledBadge } from './ItemCard'
import { Notice } from './Notice'
import { BufferedText } from './BufferedText'

type Props<I> = {
  item: I
  answer: Answer | undefined
  noteLabel: string
  onChange: (answer: Answer | undefined) => void
}

const confirm = (a: Answer): Answer => ({ value: a.value, note: a.note })

/** Kontrollpunkt: Ja / Nein / nicht relevant. "Nein" → warning + required measure. */
export function CheckpointField({ item, answer, noteLabel, onChange }: Props<CheckpointItem>) {
  type V = 'yes' | 'no' | 'na'
  const value = answer?.value as V | undefined
  const options = [
    { value: 'yes' as const, label: 'Ja' },
    { value: 'no' as const, label: 'Nein' },
    ...(item.allowNotRelevant === false ? [] : [{ value: 'na' as const, label: 'n. r.' }]),
  ]
  return (
    <ItemCard tone={value === 'no' ? 'bad' : undefined}>
      <ItemLabel label={item.label} info={item.info} proposal={item.proposal} />
      <Segmented<V>
        label={item.label}
        options={options}
        value={value}
        onChange={(v) => onChange({ value: v, note: answer?.note })}
        tones={{ yes: 'good', no: 'bad', na: 'muted' }}
      />
      {answer?.prefilled && (
        <PrefilledBadge from={answer.prefilledFrom} onConfirm={() => onChange(confirm(answer))} />
      )}
      {value === 'no' && (
        <>
          <Notice level="warning">Nicht erfüllt. Bitte Maßnahme oder Begründung eintragen.</Notice>
          <BufferedText
            multiline
            required
            label={noteLabel}
            initial={answer?.note ?? ''}
            onSave={(note) => onChange({ value: 'no', note })}
          />
        </>
      )}
    </ItemCard>
  )
}

/** Gefahrenmerkmal: vorhanden / nicht vorhanden. "vorhanden" → required measure. */
export function HazardField({ item, answer, noteLabel, onChange }: Props<HazardItem>) {
  type V = 'absent' | 'present'
  const value = answer?.value as V | undefined
  return (
    <ItemCard tone={value === 'present' ? 'bad' : undefined}>
      <ItemLabel label={item.label} info={item.info} proposal={item.proposal} />
      <Segmented<V>
        label={item.label}
        options={[
          { value: 'absent', label: 'nicht vorhanden' },
          { value: 'present', label: 'vorhanden' },
        ]}
        value={value}
        onChange={(v) => onChange({ value: v, note: answer?.note })}
        tones={{ absent: 'good', present: 'bad' }}
      />
      {answer?.prefilled && (
        <PrefilledBadge from={answer.prefilledFrom} onConfirm={() => onChange(confirm(answer))} />
      )}
      {value === 'present' && (
        <BufferedText
          multiline
          required
          label={noteLabel}
          hint="Was wird getan, um die Gefahr zu beherrschen?"
          initial={answer?.note ?? ''}
          onSave={(note) => onChange({ value: 'present', note })}
        />
      )}
    </ItemCard>
  )
}
