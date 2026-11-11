import { useId } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { listWorkers } from '../../db/profiles'
import type { SpecialItem } from '../../form/schema'
import { useWizard } from '../WizardContext'
import { ItemLabel } from '../inputs/InfoButton'
import { ItemCard } from '../inputs/ItemCard'
import { selectClass } from './selectClass'
import { assignSupervisor, memberFromWorker } from './teamOps'
import { personLabel } from '../../domain/people'

/** Choice: "m:<memberId>" for people already in the team, "w:<workerId>" for profiles. */
export function SupervisorField({ item }: { item: SpecialItem }) {
  const { assessment, update } = useWizard()
  const id = useId()
  const employees = useLiveQuery(
    async () =>
      (await listWorkers(db, assessment.organizationId, 'employee')).filter((w) => w.active),
    [assessment.organizationId],
  )
  const inTeam = new Set(assessment.team.map((m) => m.workerId).filter(Boolean))
  const candidates = employees?.filter((w) => !inTeam.has(w.id)) ?? []

  const choose = async (value: string) => {
    if (!value)
      return update({ supervisorMemberId: undefined, team: assignSupervisor(assessment.team, '') })
    let team = assessment.team
    let memberId = value.slice(2)
    if (value.startsWith('w:')) {
      const w = employees?.find((x) => x.id === memberId)
      if (!w) return
      const m = memberFromWorker(w)
      team = [...team, m]
      memberId = m.id
    }
    await update({ team: assignSupervisor(team, memberId), supervisorMemberId: memberId })
  }

  return (
    <ItemCard>
      <ItemLabel
        as="label"
        htmlFor={id}
        label={item.label}
        info={item.info}
        required={item.required}
      />
      <select
        id={id}
        className={selectClass}
        value={assessment.supervisorMemberId ? `m:${assessment.supervisorMemberId}` : ''}
        onChange={(e) => void choose(e.target.value)}
      >
        <option value="">– bitte wählen –</option>
        {assessment.team.map((m) => (
          <option key={m.id} value={`m:${m.id}`}>
            {personLabel(m)}
            {m.company ? ` (${m.company})` : ''}
          </option>
        ))}
        {candidates.map((w) => (
          <option key={w.id} value={`w:${w.id}`}>
            {personLabel(w)}
          </option>
        ))}
      </select>
      {employees && employees.length === 0 && assessment.team.length === 0 && (
        <p className="text-stone-600 dark:text-stone-400">
          Noch keine Personen gespeichert. Lege sie im Schritt{' '}
          <Link
            to={`/einsatz/${assessment.id}/team`}
            className="font-semibold text-brand-700 underline dark:text-brand-300"
          >
            „Team“
          </Link>{' '}
          an – die erste Person wird automatisch Aufsicht.
        </p>
      )}
    </ItemCard>
  )
}
