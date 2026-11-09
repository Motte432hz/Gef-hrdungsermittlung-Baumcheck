import { useState, type FormEvent } from 'react'
import { db } from '../../db/db'
import { saveOrganization } from '../../db/profiles'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { TextArea, TextField } from '../../components/form/Field'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SAVE_ERROR, SaveBar } from '../../components/SaveBar'
import { NumberingCard } from './NumberingCard'
import {
  email,
  emailList,
  numberPrefix,
  parseEmailList,
  postalCode,
  required,
} from '../../domain/validate'
import { resizeImage } from '../../lib/image'
import { useObjectUrl } from '../../lib/useObjectUrl'
import type { Organization, StoredFile } from '../../domain/types'
import { toStoredFile } from '../../lib/storedFile'

type FormState = {
  name: string
  numberPrefix: string
  street: string
  postalCode: string
  city: string
  phone: string
  email: string
  reportEmails: string
  taxNumber: string
  logo?: StoredFile
}

const fromOrg = (o: Organization): FormState => ({
  name: o.name,
  numberPrefix: o.numberPrefix,
  street: o.street ?? '',
  postalCode: o.postalCode ?? '',
  city: o.city ?? '',
  phone: o.phone ?? '',
  email: o.email ?? '',
  reportEmails: o.reportEmails.join('\n'),
  taxNumber: o.taxNumber ?? '',
  logo: o.logo,
})

export function CompanyPage() {
  const org = useOrganization()
  if (!org) return <p>Lädt …</p>
  return <CompanyForm key={org.id} org={org} />
}

function CompanyForm({ org }: { org: Organization }) {
  const [form, setForm] = useState<FormState>(() => fromOrg(org))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string>()
  const [logoError, setLogoError] = useState<string>()
  const logoUrl = useObjectUrl(form.logo)

  const set = (key: keyof FormState) => (e: { target: { value: string } }) => {
    setForm({ ...form, [key]: e.target.value })
    setSaved(false)
  }

  const onLogo = async (file: File | undefined) => {
    setLogoError(undefined)
    if (!file) return
    try {
      const logo = await toStoredFile(await resizeImage(file, 800, 'image/png'), 'image/png')
      setForm({ ...form, logo })
      setSaved(false)
    } catch {
      setLogoError('Das Bild konnte nicht gelesen werden. Bitte PNG, JPG oder SVG verwenden.')
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = {
      name: required(form.name, 'Firmenname'),
      numberPrefix: numberPrefix(form.numberPrefix),
      postalCode: postalCode(form.postalCode),
      email: email(form.email),
      reportEmails: emailList(form.reportEmails),
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setSaveError(undefined)
    try {
      await saveOrganization(db, org.id, {
        name: form.name.trim(),
        numberPrefix: form.numberPrefix.trim().toUpperCase(),
        street: form.street.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        city: form.city.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        reportEmails: parseEmailList(form.reportEmails),
        taxNumber: form.taxNumber.trim() || undefined,
        logo: form.logo,
      })
    } catch (err) {
      console.error(err)
      return setSaveError(SAVE_ERROR)
    }
    setSaved(true)
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Firma" back="/profile" backLabel="Profile" />
      <div className="space-y-4">
        <Card title="Logo">
          <div className="space-y-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Firmenlogo"
                className="h-24 max-w-full rounded-lg bg-white object-contain p-2"
              />
            ) : (
              <p className="text-stone-600 dark:text-stone-400">
                Noch kein Logo. Es erscheint oben auf jedem PDF.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border-2 border-stone-300 bg-white px-5 font-semibold has-focus-visible:outline-3 dark:border-stone-600 dark:bg-stone-800">
                {form.logo ? 'Logo ändern' : 'Logo auswählen'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={(e) => void onLogo(e.target.files?.[0])}
                />
              </label>
              {form.logo && (
                <Button variant="secondary" onClick={() => setForm({ ...form, logo: undefined })}>
                  Logo entfernen
                </Button>
              )}
            </div>
            {logoError && (
              <p className="font-semibold text-red-700 dark:text-red-400">{logoError}</p>
            )}
          </div>
        </Card>

        <Card title="Firmendaten">
          <div className="space-y-4">
            <TextField
              label="Firmenname"
              required
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              autoComplete="organization"
            />
            <TextField
              label="Kürzel für Protokollnummern"
              required
              hint="Wird vor jede Protokollnummer gesetzt, z. B. ZW → ZW-2026-0001. Vorschau unten."
              value={form.numberPrefix}
              onChange={set('numberPrefix')}
              error={errors.numberPrefix}
              maxLength={6}
              autoCapitalize="characters"
            />
            <TextField
              label="Straße und Hausnummer"
              value={form.street}
              onChange={set('street')}
              autoComplete="street-address"
            />
            <div className="grid grid-cols-[7rem_1fr] gap-3">
              <TextField
                label="PLZ"
                value={form.postalCode}
                onChange={set('postalCode')}
                error={errors.postalCode}
                inputMode="numeric"
                autoComplete="postal-code"
              />
              <TextField
                label="Ort"
                value={form.city}
                onChange={set('city')}
                autoComplete="address-level2"
              />
            </div>
            <TextField
              label="Telefon"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
            />
            <TextField
              label="E-Mail"
              type="email"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
            />
            <TextField
              label="Steuer- oder Betriebsnummer"
              value={form.taxNumber}
              onChange={set('taxNumber')}
            />
          </div>
        </Card>

        <NumberingCard prefix={form.numberPrefix} savedPrefix={org.numberPrefix} />

        <Card title="Versand">
          <TextArea
            label="E-Mail-Adressen für fertige Protokolle"
            hint="Eine Adresse pro Zeile. Der automatische Versand kommt mit der Cloud-Version."
            value={form.reportEmails}
            onChange={set('reportEmails')}
            error={errors.reportEmails}
            inputMode="email"
          />
        </Card>
      </div>
      <SaveBar saved={saved} error={saveError} />
    </form>
  )
}
