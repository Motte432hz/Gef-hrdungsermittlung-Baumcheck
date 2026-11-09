import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation, useNavigate, useParams } from 'react-router'
import { db } from '../../db/db'
import { deleteWorker, saveWorker, type WorkerInput } from '../../db/profiles'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { TextField, Toggle } from '../../components/form/Field'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SaveBar } from '../../components/SaveBar'
import { SignatureField } from '../../components/SignatureField'
import {
  QUALIFICATION_LABELS,
  QUALIFICATIONS,
  type PersonKind,
  type QualificationType,
} from '../../domain/types'
import { required } from '../../domain/validate'
import { workerKinds } from './workerKinds'

const emptyWorker = (kind: PersonKind): WorkerInput => ({
  kind,
  name: '',
  company: '',
  phone: '',
  qualifications: [],
  active: true,
})

export function WorkerEditPage({ kind }: { kind: PersonKind }) {
  const { id } = useParams()
  const k = workerKinds[kind]
  // null = not found, undefined = loading
  const initial = useLiveQuery(async (): Promise<WorkerInput | null> => {
    if (!id) return emptyWorker(kind)
    const w = await db.workers.get(id)
    if (!w || w.deletedAt) return null
    const { name, company, phone, qualifications, signature, active } = w
    return {
      kind: w.kind,
      name,
      company: company ?? '',
      phone: phone ?? '',
      qualifications,
      signature,
      active,
    }
  }, [id, kind])

  if (initial === null)
    return <PageHeader title="Nicht gefunden" back={k.path} backLabel={k.title} />
  if (initial === undefined) return <p>Lädt …</p>
  // Keyed by id: the form starts from the loaded data and is not reset by later live updates.
  return <WorkerForm key={id ?? 'new'} id={id} kind={kind} initial={initial} />
}

function WorkerForm({
  id,
  kind,
  initial,
}: {
  id?: string
  kind: PersonKind
  initial: WorkerInput
}) {
  const isNew = !id
  const org = useOrganization()
  const navigate = useNavigate()
  const k = workerKinds[kind]
  const [form, setForm] = useState<WorkerInput>(initial)
  const [errors, setErrors] = useState<{ name?: string }>({})
  const location = useLocation()
  // After creating, we navigate to the new URL; carry the confirmation over.
  const [saved, setSaved] = useState(!!(location.state as { saved?: boolean } | null)?.saved)

  if (!org) return <p>Lädt …</p>

  const update = (changes: Partial<WorkerInput>) => {
    setForm({ ...form, ...changes })
    setSaved(false)
  }

  const qual = (type: QualificationType) => form.qualifications.find((q) => q.type === type)
  const toggleQual = (type: QualificationType, on: boolean) =>
    update({
      qualifications: on
        ? [...form.qualifications, { type }]
        : form.qualifications.filter((q) => q.type !== type),
    })
  const setValidUntil = (type: QualificationType, validUntil: string) =>
    update({
      qualifications: form.qualifications.map((q) =>
        q.type === type ? { ...q, validUntil: validUntil || undefined } : q,
      ),
    })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = { name: required(form.name, 'Name') }
    setErrors(next)
    if (next.name) return
    const input: WorkerInput = {
      ...form,
      name: form.name.trim(),
      company: form.company?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      // Keep the canonical order of qualifications.
      qualifications: QUALIFICATIONS.flatMap((t) =>
        form.qualifications.filter((q) => q.type === t),
      ),
    }
    const savedId = await saveWorker(db, org.id, input, id)
    setSaved(true)
    if (isNew) navigate(`${k.path}/${savedId}`, { replace: true, state: { saved: true } })
  }

  const remove = async () => {
    if (!id) return
    if (
      !window.confirm(
        `${form.name || 'Diese Person'} wirklich löschen? Bereits abgeschlossene Protokolle bleiben unverändert.`,
      )
    )
      return
    await deleteWorker(db, id)
    navigate(k.path)
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={isNew ? `${k.single} anlegen` : form.name || k.single}
        back={k.path}
        backLabel={k.title}
      />
      <div className="space-y-4">
        <Card title="Person">
          <div className="space-y-4">
            <TextField
              label="Name"
              required
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              error={errors.name}
              autoComplete="name"
            />
            {kind === 'subcontractor' && (
              <TextField
                label="Firma"
                value={form.company ?? ''}
                onChange={(e) => update({ company: e.target.value })}
                autoComplete="organization"
              />
            )}
            <TextField
              label="Telefon"
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => update({ phone: e.target.value })}
              autoComplete="tel"
            />
            <Toggle
              label="Aktiv"
              hint="Nur aktive Personen werden bei einem neuen Einsatz zur Auswahl angeboten."
              checked={form.active}
              onChange={(active) => update({ active })}
            />
          </div>
        </Card>

        <Card title="Qualifikationen">
          <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
            Mit Ablaufdatum warnt die App, wenn ein Nachweis abgelaufen ist.
          </p>
          <ul className="space-y-3">
            {QUALIFICATIONS.map((type) => {
              const q = qual(type)
              return (
                <li
                  key={type}
                  className="rounded-xl border border-stone-200 p-3 dark:border-stone-700"
                >
                  <Toggle
                    label={QUALIFICATION_LABELS[type]}
                    checked={!!q}
                    onChange={(on) => toggleQual(type, on)}
                  />
                  {q && (
                    <div className="mt-2 pl-10">
                      <TextField
                        label="Gültig bis (optional)"
                        type="date"
                        value={q.validUntil ?? ''}
                        onChange={(e) => setValidUntil(type, e.target.value)}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title="Gespeicherte Unterschrift (optional)">
          <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
            Kann beim Einsatz übernommen werden. Im PDF steht dann „hinterlegte Unterschrift
            übernommen“.
          </p>
          <SignatureField
            label="Unterschrift"
            value={form.signature}
            onChange={(signature) => update({ signature })}
          />
        </Card>

        {!isNew && (
          <Button
            variant="secondary"
            onClick={() => void remove()}
            className="w-full text-red-700 dark:text-red-400"
          >
            {k.single} löschen
          </Button>
        )}
      </div>
      <SaveBar saved={saved} />
    </form>
  )
}
