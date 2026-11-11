import { useEffect, useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { db } from '../../db/db'
import {
  deleteWorker,
  ensureCompany,
  listCompanies,
  saveWorker,
  type WorkerInput,
} from '../../db/profiles'
import { newId } from '../../db/repo'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { TextField, Toggle } from '../../components/form/Field'
import { Segmented } from '../../components/form/Segmented'
import { ChipGroup } from '../../components/form/ChipGroup'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SignatureField } from '../../components/SignatureField'
import { GearEditor } from '../../components/gear/GearEditor'
import { SaveStatus } from '../../components/SaveStatus'
import { useAutosave } from '../../components/useAutosave'
import { QUALIFICATION_LABELS, QUALIFICATIONS, type PersonKind } from '../../domain/types'
import { sameCompanyName } from '../../db/companies'
import { personPath, TEAM_PATH } from './teamPaths'

/**
 * Route wrapper: a new person keeps its form after the first automatic save moved the URL
 * from ".../neu" to the real id (same form key), other navigation starts a fresh form.
 */
export function PersonRoute() {
  const { id } = useParams()
  const location = useLocation()
  const formKey =
    (location.state as { formKey?: string } | null)?.formKey ?? (id === 'neu' ? location.key : id!)
  return <PersonPage key={formKey} id={id === 'neu' ? undefined : id} formKey={formKey} />
}

function PersonPage({ id, formKey }: { id?: string; formKey: string }) {
  const [params] = useSearchParams()
  const [recordId] = useState(() => id ?? newId())
  // undefined = loading, null = not found
  const [initial, setInitial] = useState<WorkerInput | null>()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      let value: WorkerInput | null
      if (!id) {
        const firma = params.get('firma')
        const sub = firma && firma !== 'eigene'
        const company = sub ? await db.companies.get(firma) : undefined
        value = {
          kind: sub || params.get('art') === 'sub' ? 'subcontractor' : 'employee',
          name: params.get('name') ?? '',
          companyId: company?.id,
          company: company?.name,
          qualifications: [],
          gear: [],
          active: true,
        }
      } else {
        const w = await db.workers.get(id)
        value =
          !w || w.deletedAt
            ? null
            : {
                kind: w.kind,
                name: w.name,
                nickname: w.nickname,
                companyId: w.companyId,
                company: w.company,
                phone: w.phone,
                qualifications: w.qualifications,
                gear: w.gear ?? [],
                signature: w.signature,
                active: w.active,
              }
      }
      if (!cancelled) setInitial(value)
    })()
    return () => {
      cancelled = true
    }
    // Loaded once per form; later changes come from this form itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (initial === null)
    return <PageHeader title="Nicht gefunden" back={TEAM_PATH} backLabel="Team & Partner" />
  if (initial === undefined) return <p>Lädt …</p>
  return <PersonForm recordId={recordId} isNew={!id} formKey={formKey} initial={initial} />
}

function PersonForm({
  recordId,
  isNew,
  formKey,
  initial,
}: {
  recordId: string
  isNew: boolean
  formKey: string
  initial: WorkerInput
}) {
  const org = useOrganization()
  const navigate = useNavigate()
  const [form, setForm] = useState<WorkerInput>(initial)
  const [created, setCreated] = useState(!isNew)
  const [companyText, setCompanyText] = useState(initial.company ?? '')
  const listId = useId()
  const companies = useLiveQuery(async () => (org ? listCompanies(db, org.id) : []), [org?.id])
  const update = (changes: Partial<WorkerInput>) => setForm((f) => ({ ...f, ...changes }))

  const state = useAutosave(
    form,
    async (value) => {
      if (!org) return
      await saveWorker(
        db,
        org.id,
        {
          ...value,
          name: value.name.trim(),
          nickname: value.nickname?.trim() || undefined,
          phone: value.phone?.trim() || undefined,
          // Keep the canonical order of qualifications.
          qualifications: QUALIFICATIONS.flatMap((t) =>
            value.qualifications.filter((q) => q.type === t),
          ),
        },
        recordId,
      )
      if (!created) {
        setCreated(true)
        navigate(personPath(recordId), { replace: true, state: { formKey } })
      }
    },
    { enabled: !!org && form.name.trim().length > 0 },
  )

  /** The company is only resolved when the field is left (no half-typed companies). */
  const commitCompany = async (text: string) => {
    if (!org) return
    const name = text.trim()
    if (!name) return update({ companyId: undefined, company: undefined })
    const c = await ensureCompany(db, org.id, name)
    setCompanyText(c.name)
    update({ companyId: c.id, company: c.name })
    // Written right away: leaving the field is often a tap on "back".
    if (created || form.name.trim())
      await saveWorker(
        db,
        org.id,
        { ...form, name: form.name.trim(), companyId: c.id, company: c.name },
        recordId,
      )
  }

  const quals = form.qualifications.map((q) => q.type)
  const hasExtras =
    !!form.phone ||
    !!form.signature ||
    (form.gear?.length ?? 0) > 0 ||
    !form.active ||
    form.qualifications.some((q) => q.validUntil)

  const remove = async () => {
    if (
      !window.confirm(
        `${form.name || 'Diese Person'} wirklich löschen? Bereits abgeschlossene Protokolle bleiben unverändert.`,
      )
    )
      return
    await deleteWorker(db, recordId)
    navigate(TEAM_PATH)
  }

  return (
    <div>
      <PageHeader
        title={form.name.trim() || 'Neue Person'}
        back={TEAM_PATH}
        backLabel="Team & Partner"
      />
      <div className="space-y-4">
        <Card>
          <div className="space-y-4">
            <TextField
              label="Name"
              required
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              autoComplete="name"
              autoFocus={isNew && !form.name}
            />
            <TextField
              label="Rufname (optional)"
              hint="So wird die Person auf der Baustelle gerufen, z. B. „Kalle“."
              value={form.nickname ?? ''}
              onChange={(e) => update({ nickname: e.target.value })}
            />
            <div className="space-y-2">
              <p className="font-semibold">Gehört zu</p>
              <Segmented<PersonKind>
                label="Gehört zu"
                options={[
                  { value: 'employee', label: 'Eigene Firma' },
                  { value: 'subcontractor', label: 'Subunternehmer' },
                ]}
                value={form.kind}
                onChange={(kind) => update({ kind })}
              />
            </div>
            {form.kind === 'subcontractor' && (
              <>
                <TextField
                  label="Firma"
                  hint="Bekannte Firmen werden vorgeschlagen; eine neue wird automatisch angelegt."
                  value={companyText}
                  list={listId}
                  autoComplete="off"
                  onChange={(e) => {
                    setCompanyText(e.target.value)
                    // Picking a suggestion links right away.
                    const match = companies?.find((c) => sameCompanyName(c.name, e.target.value))
                    if (match) update({ companyId: match.id, company: match.name })
                  }}
                  onBlur={(e) => void commitCompany(e.target.value)}
                />
                <datalist id={listId}>
                  {companies?.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </>
            )}
            <ChipGroup
              legend="Qualifikationen"
              options={QUALIFICATIONS.map((q) => ({ value: q, label: QUALIFICATION_LABELS[q] }))}
              value={quals}
              onChange={(types) =>
                update({
                  qualifications: types.map(
                    (type) => form.qualifications.find((q) => q.type === type) ?? { type },
                  ),
                })
              }
            />
          </div>
        </Card>

        <details
          open={hasExtras}
          className="group rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
        >
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-2">
            <span>
              <span className="block font-semibold">Weitere Angaben</span>
              <span className="block text-sm text-stone-600 dark:text-stone-400">
                Telefon, Nachweise, PSA, Unterschrift
              </span>
            </span>
            <span aria-hidden="true" className="text-xl text-stone-400 group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="space-y-6 border-t border-stone-200 p-4 dark:border-stone-800">
            <TextField
              label="Telefon"
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => update({ phone: e.target.value })}
              autoComplete="tel"
            />
            {form.qualifications.length > 0 && (
              <fieldset className="space-y-3">
                <legend className="mb-1 font-semibold">Nachweise gültig bis (optional)</legend>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Mit Datum warnt die App, wenn ein Nachweis abgelaufen ist.
                </p>
                {QUALIFICATIONS.filter((t) => quals.includes(t)).map((type) => (
                  <TextField
                    key={type}
                    label={`${QUALIFICATION_LABELS[type]} gültig bis`}
                    type="date"
                    value={form.qualifications.find((q) => q.type === type)?.validUntil ?? ''}
                    onChange={(e) =>
                      update({
                        qualifications: form.qualifications.map((q) =>
                          q.type === type ? { ...q, validUntil: e.target.value || undefined } : q,
                        ),
                      })
                    }
                  />
                ))}
              </fieldset>
            )}
            <Toggle
              label="Aktiv"
              hint="Nur aktive Personen werden bei einem neuen Einsatz angeboten."
              checked={form.active}
              onChange={(active) => update({ active })}
            />
            <div>
              <p className="mb-1 font-semibold">PSA & Ausrüstung</p>
              <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
                Mit Prüftermin warnt die App, wenn eine Prüfung fällig ist.
              </p>
              <GearEditor value={form.gear ?? []} onChange={(gear) => update({ gear })} />
            </div>
            <div>
              <p className="mb-1 font-semibold">Gespeicherte Unterschrift (optional)</p>
              <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
                Kann beim Einsatz übernommen werden. Im PDF steht dann „hinterlegte Unterschrift
                übernommen“.
              </p>
              <SignatureField
                label="Unterschrift"
                value={form.signature}
                onChange={(signature) => update({ signature })}
              />
            </div>
          </div>
        </details>

        {created && (
          <Button
            variant="secondary"
            onClick={() => void remove()}
            className="w-full text-red-700 dark:text-red-400"
          >
            Person löschen
          </Button>
        )}
      </div>
      <SaveStatus
        state={state}
        hint={form.name.trim() ? undefined : 'Name eingeben – dann wird automatisch gespeichert.'}
      />
    </div>
  )
}
