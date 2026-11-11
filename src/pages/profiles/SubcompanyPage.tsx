import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { db } from '../../db/db'
import { deleteCompany, listWorkers, saveCompany, type CompanyInput } from '../../db/profiles'
import { newId } from '../../db/repo'
import { useOrganization } from '../../app/useOrganization'
import { useRecordRoute } from '../../components/useRecordRoute'
import { PageHeader } from '../../components/PageHeader'
import { TextArea, TextField } from '../../components/form/Field'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LinkList, ListLink } from '../../components/ListLink'
import { SaveStatus } from '../../components/SaveStatus'
import { useAutosave } from '../../components/useAutosave'
import { personLabel } from '../../domain/people'
import { qualificationSummary } from '../../domain/qualifications'
import { companyPath, personPath, TEAM_PATH } from './teamPaths'
import { useCloudRights } from '../../cloud/useCloudRights'
import { ReadOnlyNotice } from '../../components/ReadOnlyNotice'

/** Same form-key logic as for people: the first automatic save does not reset the form. */
export function SubcompanyRoute() {
  const { id, formKey } = useRecordRoute()
  return <SubcompanyPage key={formKey} id={id} formKey={formKey} />
}

function SubcompanyPage({ id, formKey }: { id?: string; formKey: string }) {
  const [recordId] = useState(() => id ?? newId())
  const [initial, setInitial] = useState<CompanyInput | null>()
  const [createdBy, setCreatedBy] = useState<string>()
  useEffect(() => {
    void (async () => {
      if (!id) return setInitial({ name: '' })
      const c = await db.companies.get(id)
      setCreatedBy(c?.createdBy)
      setInitial(
        !c || c.deletedAt
          ? null
          : {
              name: c.name,
              contactPerson: c.contactPerson,
              phone: c.phone,
              email: c.email,
              notes: c.notes,
            },
      )
    })()
    // Loaded once per form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (initial === null)
    return <PageHeader title="Nicht gefunden" back={TEAM_PATH} backLabel="Team & Partner" />
  if (initial === undefined) return <p>Lädt …</p>
  return (
    <SubcompanyForm
      recordId={recordId}
      isNew={!id}
      formKey={formKey}
      initial={initial}
      createdBy={createdBy}
    />
  )
}

function SubcompanyForm({
  recordId,
  isNew,
  formKey,
  initial,
  createdBy,
}: {
  recordId: string
  isNew: boolean
  formKey: string
  initial: CompanyInput
  createdBy?: string
}) {
  const org = useOrganization()
  const rights = useCloudRights()
  const readOnly = !rights.canEdit({ createdBy })
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [created, setCreated] = useState(!isNew)
  const update = (changes: Partial<CompanyInput>) => setForm((f) => ({ ...f, ...changes }))
  const people = useLiveQuery(
    async () =>
      org
        ? (await listWorkers(db, org.id, 'subcontractor')).filter((w) => w.companyId === recordId)
        : [],
    [org?.id, recordId],
  )
  const clean = (v?: string) => v?.trim() || undefined

  const state = useAutosave(
    form,
    async (v) => {
      if (!org) return
      await saveCompany(
        db,
        org.id,
        {
          name: v.name.trim(),
          contactPerson: clean(v.contactPerson),
          phone: clean(v.phone),
          email: clean(v.email),
          notes: clean(v.notes),
        },
        recordId,
      )
      if (!created) {
        setCreated(true)
        navigate(companyPath(recordId), { replace: true, state: { formKey } })
      }
    },
    { enabled: !!org && form.name.trim().length > 0 && !readOnly },
  )

  const remove = async () => {
    const n = people?.length ?? 0
    if (
      !window.confirm(
        `${form.name || 'Diese Firma'} wirklich löschen?${n ? ` Die ${n} Personen bleiben als Subunternehmer ohne Firma erhalten.` : ''}`,
      )
    )
      return
    await deleteCompany(db, recordId)
    navigate(TEAM_PATH)
  }

  return (
    <div>
      <PageHeader
        title={form.name.trim() || 'Neue Subunternehmer-Firma'}
        back={TEAM_PATH}
        backLabel="Team & Partner"
      />
      <div className="space-y-4">
        {readOnly && (
          <ReadOnlyNotice text="Diese Firma hat jemand anderes angelegt. Ändern können sie Admins der Firma." />
        )}
        <fieldset disabled={readOnly}>
          <Card>
            <div className="space-y-4">
              <TextField
                label="Firmenname"
                required
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                autoComplete="organization"
                autoFocus={isNew}
              />
              <TextField
                label="Ansprechpartner/in"
                value={form.contactPerson ?? ''}
                onChange={(e) => update({ contactPerson: e.target.value })}
              />
              <TextField
                label="Telefon"
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => update({ phone: e.target.value })}
              />
              <TextField
                label="E-Mail"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => update({ email: e.target.value })}
              />
              <TextArea
                label="Hinweise"
                value={form.notes ?? ''}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </div>
          </Card>
        </fieldset>
        {created && (
          <Card title={`Personen (${people?.length ?? 0})`}>
            <div className="space-y-3">
              {people && people.length > 0 && (
                <LinkList>
                  {people.map((w) => (
                    <ListLink
                      key={w.id}
                      to={personPath(w.id)}
                      title={personLabel(w)}
                      meta={qualificationSummary(w)}
                    />
                  ))}
                </LinkList>
              )}
              <Link
                to={`${personPath('neu')}?firma=${recordId}`}
                className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-brand-700 px-4 font-semibold text-brand-700 dark:border-brand-300 dark:text-brand-300"
              >
                + Person bei {form.name.trim() || 'dieser Firma'}
              </Link>
            </div>
          </Card>
        )}

        {created && rights.canDelete({ createdBy }, 'record') && (
          <Button
            variant="secondary"
            onClick={() => void remove()}
            className="w-full text-red-700 dark:text-red-400"
          >
            Firma löschen
          </Button>
        )}
      </div>
      <SaveStatus
        state={state}
        hint={
          form.name.trim() ? undefined : 'Firmenname eingeben – dann wird automatisch gespeichert.'
        }
      />
    </div>
  )
}
