import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { listWorkers, saveWorker } from '../../db/profiles'
import { newId } from '../../db/repo'
import type { SpecialItem } from '../../form/schema'
import {
  QUALIFICATION_LABELS,
  QUALIFICATIONS,
  type QualificationType,
  type Role,
  type TeamMember,
} from '../../domain/types'
import { useWizard } from '../WizardContext'
import { ItemLabel } from '../inputs/InfoButton'
import { ItemCard } from '../inputs/ItemCard'
import { Notice } from '../inputs/Notice'
import { Button } from '../../components/Button'
import { TextField, Toggle } from '../../components/form/Field'
import { memberFromWorker, toggleRole } from './teamOps'
import { ROLE_LABELS } from '../../domain/roles'
import { personLabel } from '../../domain/people'

function availableRoles(jobTypes: string[]): Role[] {
  const roles: Role[] = ['supervisor', 'climber', 'ground', 'safety_lookout']
  if (jobTypes.includes('aerial_platform')) roles.push('platform_operator')
  if (jobTypes.includes('crane')) roles.push('crane_signaller')
  return roles
}

export function TeamField({ item }: { item: SpecialItem }) {
  const { assessment, update, issues } = useWizard()
  const [adding, setAdding] = useState<'none' | 'new'>('none')
  const workers = useLiveQuery(
    async () => (await listWorkers(db, assessment.organizationId)).filter((w) => w.active),
    [assessment.organizationId],
  )
  const team = assessment.team
  const jobTypes = (assessment.answers['job.types']?.value as string[] | undefined) ?? []
  const roles = availableRoles(jobTypes)
  const inTeam = new Set(team.map((m) => m.workerId).filter(Boolean))
  const pickable = workers?.filter((w) => !inTeam.has(w.id)) ?? []
  const hints = issues.filter((i) => i.itemId === 'team.members' && i.level !== 'blocking')

  const setTeam = (next: TeamMember[]) => {
    const supervisor = next.find((m) => m.roles.includes('supervisor'))
    return update({ team: next, supervisorMemberId: supervisor?.id })
  }

  const remove = (m: TeamMember) => setTeam(team.filter((x) => x.id !== m.id))

  return (
    <div className="space-y-4">
      <ItemCard>
        <ItemLabel label={item.label} info={item.info} required={item.required} />
        {team.length === 0 && (
          <p className="text-stone-600 dark:text-stone-400">Noch niemand eingetragen.</p>
        )}
        <ul className="space-y-3">
          {team.map((m) => (
            <li
              key={m.id}
              className="space-y-3 rounded-xl border-2 border-stone-200 p-3 dark:border-stone-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{personLabel(m)}</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    {[
                      m.kind === 'employee' ? 'Mitarbeiter/in' : m.company || 'Subunternehmer/Gast',
                      m.qualifications.map((q) => QUALIFICATION_LABELS[q.type]).join(', ') ||
                        'keine Qualifikation hinterlegt',
                    ].join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(m)}
                  aria-label={`${m.name} entfernen`}
                  className="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  ×
                </button>
              </div>
              <fieldset>
                <legend className="mb-1 text-sm font-semibold">Rollen von {m.name}</legend>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <label
                      key={r}
                      className="inline-flex min-h-12 cursor-pointer items-center rounded-full border-2 border-stone-300 px-4 font-semibold has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-brand-500 dark:border-stone-600"
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={m.roles.includes(r)}
                        onChange={(e) =>
                          void setTeam(
                            r === 'supervisor' && e.target.checked
                              ? // Only one supervisor.
                                toggleRole(
                                  team.map((x) => ({
                                    ...x,
                                    roles: x.roles.filter((y) => y !== 'supervisor'),
                                  })),
                                  m.id,
                                  r,
                                  true,
                                )
                              : toggleRole(team, m.id, r, e.target.checked),
                          )
                        }
                      />
                      {ROLE_LABELS[r]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
        {hints.map((h) => (
          <Notice key={h.key} level={h.level}>
            {h.message}
          </Notice>
        ))}
      </ItemCard>

      <ItemCard>
        <p className="text-lg font-semibold">Person hinzufügen</p>
        {pickable.length > 0 && (
          <ul className="space-y-2">
            {pickable.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => void setTeam([...team, memberFromWorker(w)])}
                  className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border-2 border-stone-300 px-3 text-left font-semibold hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
                >
                  <span>
                    {personLabel(w)}
                    <span className="block text-sm font-normal text-stone-600 dark:text-stone-400">
                      {w.kind === 'employee' ? 'Mitarbeiter/in' : w.company || 'Subunternehmer'}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-2xl text-brand-700 dark:text-brand-300">
                    +
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {adding === 'new' ? (
          <NewPersonForm
            onCancel={() => setAdding('none')}
            onAdd={async (member, saveProfile) => {
              let m = member
              if (saveProfile) {
                const workerId = await saveWorker(db, assessment.organizationId, {
                  kind: 'subcontractor',
                  name: member.name,
                  nickname: member.nickname,
                  company: member.company,
                  qualifications: member.qualifications,
                  active: true,
                })
                m = { ...member, workerId, kind: 'subcontractor' }
              }
              await setTeam([...team, m])
              setAdding('none')
            }}
          />
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setAdding('new')}>
            + Neue Person (Subunternehmer, Aushilfe …)
          </Button>
        )}
      </ItemCard>
    </div>
  )
}

function NewPersonForm({
  onAdd,
  onCancel,
}: {
  onAdd: (m: TeamMember, saveProfile: boolean) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [company, setCompany] = useState('')
  const [quals, setQuals] = useState<QualificationType[]>([])
  const [saveProfile, setSaveProfile] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async () => {
    if (!name.trim()) return setError('Name ist ein Pflichtfeld.')
    await onAdd(
      {
        id: newId(),
        kind: 'guest',
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        company: company.trim() || undefined,
        qualifications: quals.map((type) => ({ type })),
        roles: [],
      },
      saveProfile,
    )
  }

  return (
    <div className="space-y-3 rounded-xl border-2 border-brand-700 p-3">
      <TextField
        label="Name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
      />
      <TextField
        label="Rufname (optional)"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <TextField label="Firma" value={company} onChange={(e) => setCompany(e.target.value)} />
      <fieldset>
        <legend className="mb-1 font-semibold">Qualifikationen</legend>
        <div className="grid grid-cols-2 gap-x-3">
          {QUALIFICATIONS.map((q) => (
            <Toggle
              key={q}
              label={QUALIFICATION_LABELS[q]}
              checked={quals.includes(q)}
              onChange={(on) => setQuals(on ? [...quals, q] : quals.filter((x) => x !== q))}
            />
          ))}
        </div>
      </fieldset>
      <Toggle
        label="Als Subunternehmer-Profil speichern"
        hint="Dann ist die Person beim nächsten Einsatz auswählbar."
        checked={saveProfile}
        onChange={setSaveProfile}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void submit()}>Hinzufügen</Button>
        <Button variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
