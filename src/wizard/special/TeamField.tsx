import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { ensureCompany, listCompanies, listWorkers, saveWorker } from '../../db/profiles'
import { newId } from '../../db/repo'
import type { SpecialItem } from '../../form/schema'
import {
  QUALIFICATION_LABELS,
  QUALIFICATIONS,
  type QualificationType,
  type Role,
  type TeamMember,
  type Worker,
} from '../../domain/types'
import { useWizard } from '../WizardContext'
import { ItemLabel } from '../inputs/InfoButton'
import { ItemCard } from '../inputs/ItemCard'
import { Notice } from '../inputs/Notice'
import { Button } from '../../components/Button'
import { TextField, Toggle } from '../../components/form/Field'
import { addWorkers, companyGroups, searchKey, suggestRoles, toggleRole } from './teamOps'
import { Segmented } from '../../components/form/Segmented'
import { ChipGroup } from '../../components/form/ChipGroup'
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
  const workers = useLiveQuery(
    async () => (await listWorkers(db, assessment.organizationId)).filter((w) => w.active),
    [assessment.organizationId],
  )
  const team = assessment.team
  const jobTypes = (assessment.answers['job.types']?.value as string[] | undefined) ?? []
  const roles = availableRoles(jobTypes)
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
                  {m.gear && m.gear.length > 0 && (
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                      PSA: {m.gear.map((g) => g.name).join(', ')}
                    </p>
                  )}
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

      <AddPersonCard
        team={team}
        workers={workers ?? []}
        jobTypes={jobTypes}
        roles={roles}
        onAdd={(next) => void setTeam(next)}
      />
    </div>
  )
}

/** Search saved people or create a new one – without leaving the wizard. */
function AddPersonCard({
  team,
  workers,
  jobTypes,
  roles,
  onAdd,
}: {
  team: TeamMember[]
  workers: Worker[]
  jobTypes: string[]
  roles: Role[]
  onAdd: (team: TeamMember[]) => void
}) {
  const { assessment } = useWizard()
  const companies =
    useLiveQuery(() => listCompanies(db, assessment.organizationId), [assessment.organizationId]) ??
    []
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState<string | null>(null)
  const inTeam = new Set(team.map((m) => m.workerId).filter(Boolean))
  const pickable = workers.filter((w) => !inTeam.has(w.id))
  const q = searchKey(query)
  const matches = q
    ? pickable.filter((w) => searchKey(`${personLabel(w)} ${w.company ?? ''}`).includes(q))
    : pickable
  const exists = workers.some((w) => searchKey(w.name) === q)
  const groups = q ? [] : companyGroups(pickable)

  const add = (ws: Worker[]) => {
    onAdd(addWorkers(team, ws, jobTypes))
    setQuery('')
  }

  if (creating !== null) {
    return (
      <ItemCard>
        <p className="text-lg font-semibold">Neue Person</p>
        <NewPersonForm
          initialName={creating}
          team={team}
          jobTypes={jobTypes}
          roles={roles}
          companies={companies.map((c) => c.name)}
          firstPerson={workers.length === 0}
          onCancel={() => setCreating(null)}
          onAdd={async (member, kind, save) => {
            let m = member
            if (save) {
              const company =
                kind === 'subcontractor' && member.company
                  ? await ensureCompany(db, assessment.organizationId, member.company)
                  : undefined
              const workerId = await saveWorker(db, assessment.organizationId, {
                kind,
                name: member.name,
                nickname: member.nickname,
                companyId: company?.id,
                company: company?.name,
                qualifications: member.qualifications,
                active: true,
              })
              m = { ...member, workerId, kind, company: company?.name }
            }
            // Only one supervisor: a new supervisor replaces the previous one.
            const rest = m.roles.includes('supervisor')
              ? team.map((x) => ({ ...x, roles: x.roles.filter((r) => r !== 'supervisor') }))
              : team
            onAdd([...rest, m])
            setCreating(null)
            setQuery('')
          }}
        />
      </ItemCard>
    )
  }

  return (
    <ItemCard>
      <TextField
        label="Person hinzufügen"
        type="search"
        placeholder="Name suchen oder neu eingeben"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {groups.map((g) => (
        <Button
          key={g.company}
          variant="secondary"
          className="w-full"
          onClick={() => add(g.workers)}
        >
          Alle von {g.company} hinzufügen ({g.workers.length})
        </Button>
      ))}
      {matches.length > 0 && (
        <ul className="space-y-2" aria-label="Gespeicherte Personen">
          {matches.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => add([w])}
                className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border-2 border-stone-300 px-3 text-left font-semibold hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
              >
                <span>
                  {personLabel(w)}
                  <span className="block text-sm font-normal text-stone-600 dark:text-stone-400">
                    {[
                      w.kind === 'employee' ? 'Mitarbeiter/in' : w.company || 'Subunternehmer',
                      w.qualifications.map((x) => QUALIFICATION_LABELS[x.type]).join(', '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
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
      {q && matches.length === 0 && (
        <p className="text-stone-600 dark:text-stone-400">Keine gespeicherte Person gefunden.</p>
      )}
      {q && !exists ? (
        <Button className="w-full" onClick={() => setCreating(query.trim())}>
          „{query.trim()}“ neu anlegen
        </Button>
      ) : (
        !q && (
          <Button variant="secondary" className="w-full" onClick={() => setCreating('')}>
            + Neue Person anlegen
          </Button>
        )
      )}
    </ItemCard>
  )
}

type SavedKind = 'employee' | 'subcontractor'

function NewPersonForm({
  initialName,
  team,
  jobTypes,
  roles,
  companies,
  firstPerson,
  onAdd,
  onCancel,
}: {
  initialName: string
  team: TeamMember[]
  jobTypes: string[]
  roles: Role[]
  companies: string[]
  firstPerson: boolean
  onAdd: (m: TeamMember, kind: SavedKind, save: boolean) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [nickname, setNickname] = useState('')
  // Without any saved people yet, the first ones are most likely the own staff.
  const [kind, setKind] = useState<SavedKind>(firstPerson ? 'employee' : 'subcontractor')
  const [company, setCompany] = useState('')
  const [quals, setQuals] = useState<QualificationType[]>([])
  const [chosenRoles, setChosenRoles] = useState<Role[] | null>(null)
  const [save, setSave] = useState(true)
  const [error, setError] = useState<string>()
  const listId = useId()
  // Proposal follows the qualifications until roles are picked by hand.
  const memberRoles =
    chosenRoles ??
    suggestRoles(
      team,
      quals.map((type) => ({ type })),
      jobTypes,
    )

  const submit = async () => {
    if (!name.trim()) return setError('Name ist ein Pflichtfeld.')
    await onAdd(
      {
        id: newId(),
        kind: save ? kind : 'guest',
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        company: kind === 'subcontractor' ? company.trim() || undefined : undefined,
        qualifications: quals.map((type) => ({ type })),
        roles: memberRoles,
      },
      kind,
      save,
    )
  }

  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        autoComplete="off"
      />
      <TextField
        label="Rufname (optional)"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <div className="space-y-2">
        <p className="font-semibold">Gehört zu</p>
        <Segmented<SavedKind>
          label="Gehört zu"
          options={[
            { value: 'employee', label: 'Eigene Firma' },
            { value: 'subcontractor', label: 'Subunternehmer' },
          ]}
          value={kind}
          onChange={setKind}
        />
      </div>
      {kind === 'subcontractor' && (
        <>
          <TextField
            label="Firma"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            list={listId}
            autoComplete="organization"
          />
          <datalist id={listId}>
            {companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </>
      )}
      <ChipGroup
        legend="Qualifikationen"
        options={QUALIFICATIONS.map((x) => ({ value: x, label: QUALIFICATION_LABELS[x] }))}
        value={quals}
        onChange={(v) => setQuals(v)}
      />
      <ChipGroup
        legend="Rolle im Einsatz"
        hint={chosenRoles ? undefined : 'Vorschlag – zum Ändern antippen'}
        options={roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
        value={memberRoles}
        onChange={setChosenRoles}
      />
      <Toggle
        label="Für spätere Einsätze speichern"
        hint="Die Person steht dann bei jedem Einsatz zur Auswahl."
        checked={save}
        onChange={setSave}
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
