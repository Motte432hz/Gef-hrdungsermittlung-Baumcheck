import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { deleteCustomer, saveCustomer, type CustomerInput } from '../../db/profiles'
import { newId } from '../../db/repo'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { TextArea, TextField } from '../../components/form/Field'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SaveStatus } from '../../components/SaveStatus'
import { useAutosave } from '../../components/useAutosave'
import { useRecordRoute } from '../../components/useRecordRoute'
import { useCloudRights } from '../../cloud/useCloudRights'
import { ReadOnlyNotice } from '../../components/ReadOnlyNotice'

import type { CustomerSite } from '../../domain/types'
import { email, postalCode, required } from '../../domain/validate'

const emptyCustomer = (): CustomerInput => ({
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  street: '',
  postalCode: '',
  city: '',
  sites: [],
})

const trimOrUndef = (v: string | undefined) => v?.trim() || undefined

type Errors = Record<string, string | undefined>

export function CustomerEditPage() {
  const { id, formKey } = useRecordRoute()
  return <CustomerLoader key={formKey} id={id} formKey={formKey} />
}

function CustomerLoader({ id, formKey }: { id?: string; formKey: string }) {
  const [recordId] = useState(() => id ?? newId())
  // null = not found, undefined = loading
  const [initial, setInitial] = useState<CustomerInput | null>()
  const [createdBy, setCreatedBy] = useState<string>()
  useEffect(() => {
    void (async () => {
      if (!id) return setInitial(emptyCustomer())
      const c = await db.customers.get(id)
      setCreatedBy(c?.createdBy)
      setInitial(
        !c || c.deletedAt
          ? null
          : {
              name: c.name,
              contactPerson: c.contactPerson ?? '',
              phone: c.phone ?? '',
              email: c.email ?? '',
              street: c.street ?? '',
              postalCode: c.postalCode ?? '',
              city: c.city ?? '',
              sites: c.sites,
            },
      )
    })()
    // Loaded once per form; later changes come from this form itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (initial === null)
    return <PageHeader title="Nicht gefunden" back="/profile/kunden" backLabel="Kunden" />
  if (initial === undefined) return <p>Lädt …</p>
  return (
    <CustomerForm
      recordId={recordId}
      isNew={!id}
      formKey={formKey}
      initial={initial}
      createdBy={createdBy}
    />
  )
}

function validate(form: CustomerInput): Errors {
  const out: Errors = {
    name: required(form.name, 'Name'),
    email: email(form.email),
    postalCode: postalCode(form.postalCode),
  }
  for (const s of form.sites) {
    out[`site:${s.id}:name`] = required(s.name, 'Bezeichnung')
    out[`site:${s.id}:postalCode`] = postalCode(s.postalCode)
  }
  return out
}

function CustomerForm({
  recordId,
  isNew,
  formKey,
  initial,
  createdBy,
}: {
  recordId: string
  isNew: boolean
  formKey: string
  initial: CustomerInput
  createdBy?: string
}) {
  const org = useOrganization()
  const rights = useCloudRights()
  const readOnly = !rights.canEdit({ createdBy })
  const navigate = useNavigate()
  const [form, setForm] = useState<CustomerInput>(initial)
  const [created, setCreated] = useState(!isNew)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const allErrors = validate(form)
  const valid = !Object.values(allErrors).some(Boolean)
  // New objects show their missing name right away; other fields once changed.
  const errors = Object.fromEntries(
    Object.entries(allErrors).filter(([k]) => touched.has(k) || k.endsWith(':name')),
  ) as Errors

  const update = (changes: Partial<CustomerInput>, key?: string) => {
    setForm((f) => ({ ...f, ...changes }))
    if (key) setTouched((t) => new Set(t).add(key))
  }
  const field = (
    key: 'name' | 'contactPerson' | 'phone' | 'email' | 'street' | 'postalCode' | 'city',
  ) => ({
    value: form[key] ?? '',
    onChange: (e: { target: { value: string } }) => update({ [key]: e.target.value }, key),
    error: errors[key],
  })

  const updateSite = (siteId: string, changes: Partial<CustomerSite>) => {
    setForm((f) => ({
      ...f,
      sites: f.sites.map((s) => (s.id === siteId ? { ...s, ...changes } : s)),
    }))
    for (const k of Object.keys(changes)) setTouched((t) => new Set(t).add(`site:${siteId}:${k}`))
  }
  const addSite = () =>
    update({
      sites: [
        ...form.sites,
        { id: newId(), name: '', street: '', postalCode: '', city: form.city ?? '', notes: '' },
      ],
    })
  const removeSite = (siteId: string) =>
    update({ sites: form.sites.filter((s) => s.id !== siteId) })

  const state = useAutosave(
    form,
    async (f) => {
      if (!org) return
      await saveCustomer(
        db,
        org.id,
        {
          name: f.name.trim(),
          contactPerson: trimOrUndef(f.contactPerson),
          phone: trimOrUndef(f.phone),
          email: trimOrUndef(f.email),
          street: trimOrUndef(f.street),
          postalCode: trimOrUndef(f.postalCode),
          city: trimOrUndef(f.city),
          sites: f.sites.map((x) => ({
            id: x.id,
            name: x.name.trim(),
            street: trimOrUndef(x.street),
            postalCode: trimOrUndef(x.postalCode),
            city: trimOrUndef(x.city),
            notes: trimOrUndef(x.notes),
          })),
        },
        recordId,
      )
      if (!created) {
        setCreated(true)
        navigate(`/profile/kunden/${recordId}`, { replace: true, state: { formKey } })
      }
    },
    { enabled: !!org && valid && !readOnly },
  )

  const remove = async () => {
    if (
      !window.confirm(
        `${form.name || 'Diesen Kunden'} wirklich löschen? Bereits abgeschlossene Protokolle bleiben unverändert.`,
      )
    )
      return
    await deleteCustomer(db, recordId)
    navigate('/profile/kunden')
  }

  return (
    <div>
      <PageHeader
        title={form.name.trim() || 'Neuer Kunde'}
        back="/profile/kunden"
        backLabel="Kunden"
      />
      <div className="space-y-4">
        {readOnly && (
          <ReadOnlyNotice text="Diesen Kunden hat jemand anderes angelegt. Ändern können ihn Admins der Firma." />
        )}
        <fieldset disabled={readOnly} className="space-y-4">
          <Card title="Kunde">
            <div className="space-y-4">
              <TextField
                label="Name"
                required
                hint="z. B. Hausverwaltung Müller GmbH"
                {...field('name')}
              />
              <TextField label="Ansprechpartner/in" {...field('contactPerson')} />
              <TextField label="Telefon" type="tel" {...field('phone')} />
              <TextField label="E-Mail" type="email" {...field('email')} />
              <TextField label="Straße und Hausnummer" {...field('street')} />
              <div className="grid grid-cols-[7rem_1fr] gap-3">
                <TextField label="PLZ" inputMode="numeric" {...field('postalCode')} />
                <TextField label="Ort" {...field('city')} />
              </div>
            </div>
          </Card>

          <Card title="Objekte">
            <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
              Grundstücke oder Liegenschaften, an denen gearbeitet wird. Die Adresse wird beim
              Einsatz übernommen.
            </p>
            <div className="space-y-4">
              {form.sites.map((s, i) => (
                <fieldset
                  key={s.id}
                  className="space-y-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700"
                >
                  <legend className="px-1 font-semibold">Objekt {i + 1}</legend>
                  <TextField
                    label="Bezeichnung"
                    required
                    hint="z. B. Wohnanlage Lindenstraße"
                    value={s.name}
                    onChange={(e) => updateSite(s.id, { name: e.target.value })}
                    error={errors[`site:${s.id}:name`]}
                  />
                  <TextField
                    label="Straße und Hausnummer"
                    value={s.street ?? ''}
                    onChange={(e) => updateSite(s.id, { street: e.target.value })}
                  />
                  <div className="grid grid-cols-[7rem_1fr] gap-3">
                    <TextField
                      label="PLZ"
                      inputMode="numeric"
                      value={s.postalCode ?? ''}
                      onChange={(e) => updateSite(s.id, { postalCode: e.target.value })}
                      error={errors[`site:${s.id}:postalCode`]}
                    />
                    <TextField
                      label="Ort"
                      value={s.city ?? ''}
                      onChange={(e) => updateSite(s.id, { city: e.target.value })}
                    />
                  </div>
                  <TextArea
                    label="Hinweise"
                    hint="z. B. Zufahrt, Schlüssel, Ansprechpartner vor Ort"
                    value={s.notes ?? ''}
                    onChange={(e) => updateSite(s.id, { notes: e.target.value })}
                  />
                  <Button variant="secondary" onClick={() => removeSite(s.id)}>
                    Objekt entfernen
                  </Button>
                </fieldset>
              ))}
              <Button variant="secondary" onClick={addSite} className="w-full">
                + Objekt hinzufügen
              </Button>
            </div>
          </Card>
        </fieldset>
        {created && rights.canDelete({ createdBy }, 'record') && (
          <Button
            variant="secondary"
            onClick={() => void remove()}
            className="w-full text-red-700 dark:text-red-400"
          >
            Kunde löschen
          </Button>
        )}
      </div>
      <SaveStatus
        state={state}
        hint={
          valid
            ? undefined
            : allErrors.name
              ? 'Namen eingeben – dann wird automatisch gespeichert.'
              : 'Bitte die markierten Felder ausfüllen – dann wird gespeichert.'
        }
      />
    </div>
  )
}
