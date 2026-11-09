import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation, useNavigate, useParams } from 'react-router'
import { db } from '../../db/db'
import { deleteCustomer, saveCustomer, type CustomerInput } from '../../db/profiles'
import { newId } from '../../db/repo'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { TextArea, TextField } from '../../components/form/Field'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SAVE_ERROR, SaveBar } from '../../components/SaveBar'
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
  const { id } = useParams()
  // null = not found, undefined = loading
  const initial = useLiveQuery(async (): Promise<CustomerInput | null> => {
    if (!id) return emptyCustomer()
    const c = await db.customers.get(id)
    if (!c || c.deletedAt) return null
    return {
      name: c.name,
      contactPerson: c.contactPerson ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      street: c.street ?? '',
      postalCode: c.postalCode ?? '',
      city: c.city ?? '',
      sites: c.sites,
    }
  }, [id])

  if (initial === null)
    return <PageHeader title="Nicht gefunden" back="/profile/kunden" backLabel="Kunden" />
  if (initial === undefined) return <p>Lädt …</p>
  return <CustomerForm key={id ?? 'new'} id={id} initial={initial} />
}

function CustomerForm({ id, initial }: { id?: string; initial: CustomerInput }) {
  const isNew = !id
  const org = useOrganization()
  const navigate = useNavigate()
  const [form, setForm] = useState<CustomerInput>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const location = useLocation()
  // After creating, we navigate to the new URL; carry the confirmation over.
  const [saved, setSaved] = useState(!!(location.state as { saved?: boolean } | null)?.saved)
  const [saveError, setSaveError] = useState<string>()

  if (!org) return <p>Lädt …</p>

  const update = (changes: Partial<CustomerInput>) => {
    setForm({ ...form, ...changes })
    setSaved(false)
  }
  const field = (
    key: 'name' | 'contactPerson' | 'phone' | 'email' | 'street' | 'postalCode' | 'city',
  ) => ({
    value: form[key] ?? '',
    onChange: (e: { target: { value: string } }) => update({ [key]: e.target.value }),
    error: errors[key],
  })

  const updateSite = (siteId: string, changes: Partial<CustomerSite>) =>
    update({ sites: form.sites.map((s) => (s.id === siteId ? { ...s, ...changes } : s)) })
  const addSite = () =>
    update({
      sites: [
        ...form.sites,
        { id: newId(), name: '', street: '', postalCode: '', city: form.city ?? '', notes: '' },
      ],
    })
  const removeSite = (siteId: string) =>
    update({ sites: form.sites.filter((s) => s.id !== siteId) })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {
      name: required(form.name, 'Name'),
      email: email(form.email),
      postalCode: postalCode(form.postalCode),
    }
    for (const s of form.sites) {
      next[`site:${s.id}:name`] = required(s.name, 'Bezeichnung')
      next[`site:${s.id}:postalCode`] = postalCode(s.postalCode)
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    const input: CustomerInput = {
      name: form.name.trim(),
      contactPerson: trimOrUndef(form.contactPerson),
      phone: trimOrUndef(form.phone),
      email: trimOrUndef(form.email),
      street: trimOrUndef(form.street),
      postalCode: trimOrUndef(form.postalCode),
      city: trimOrUndef(form.city),
      sites: form.sites.map((s) => ({
        id: s.id,
        name: s.name.trim(),
        street: trimOrUndef(s.street),
        postalCode: trimOrUndef(s.postalCode),
        city: trimOrUndef(s.city),
        notes: trimOrUndef(s.notes),
      })),
    }
    setSaveError(undefined)
    let savedId: string
    try {
      savedId = await saveCustomer(db, org.id, input, id)
    } catch (err) {
      console.error(err)
      return setSaveError(SAVE_ERROR)
    }
    setSaved(true)
    if (isNew) navigate(`/profile/kunden/${savedId}`, { replace: true, state: { saved: true } })
  }

  const remove = async () => {
    if (!id) return
    if (
      !window.confirm(
        `${form.name || 'Diesen Kunden'} wirklich löschen? Bereits abgeschlossene Protokolle bleiben unverändert.`,
      )
    )
      return
    await deleteCustomer(db, id)
    navigate('/profile/kunden')
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={isNew ? 'Kunde anlegen' : form.name || 'Kunde'}
        back="/profile/kunden"
        backLabel="Kunden"
      />
      <div className="space-y-4">
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
            Grundstücke oder Liegenschaften, an denen gearbeitet wird. Die Adresse wird beim Einsatz
            übernommen.
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

        {!isNew && (
          <Button
            variant="secondary"
            onClick={() => void remove()}
            className="w-full text-red-700 dark:text-red-400"
          >
            Kunde löschen
          </Button>
        )}
      </div>
      <SaveBar saved={saved} error={saveError} />
    </form>
  )
}
