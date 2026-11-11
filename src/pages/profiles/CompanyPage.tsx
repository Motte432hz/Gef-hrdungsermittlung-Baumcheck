import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { getDefaultEquipmentPreset, saveOrganization } from '../../db/profiles'
import { equipmentItems } from './equipmentItems'
import { useCloudRights } from '../../cloud/useCloudRights'
import { usePendingRequests } from '../../cloud/usePendingRequests'
import { ReadOnlyNotice } from '../../components/ReadOnlyNotice'
import { useOrganization } from '../../app/useOrganization'
import { PageHeader } from '../../components/PageHeader'
import { TextArea, TextField } from '../../components/form/Field'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SaveStatus } from '../../components/SaveStatus'
import { useAutosave } from '../../components/useAutosave'
import { NumberingCard } from './NumberingCard'
import { AppearanceCard, type AppearanceValue } from './AppearanceCard'
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
  appearance: AppearanceValue
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
  appearance: {
    brandColor: o.brandColor,
    brandColor2: o.brandColor2,
    brandInApp: o.brandInApp ?? false,
    brandInPdf: o.brandInPdf ?? false,
    pdfLayout: o.pdfLayout ?? 'standard',
  },
})

export function CompanyPage() {
  const org = useOrganization()
  if (!org) return <p>Lädt …</p>
  return <CompanyForm key={org.id} org={org} />
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  return {
    name: required(form.name, 'Firmenname'),
    numberPrefix: numberPrefix(form.numberPrefix),
    postalCode: postalCode(form.postalCode),
    email: email(form.email),
    reportEmails: emailList(form.reportEmails),
  }
}

function CompanyForm({ org }: { org: Organization }) {
  const [form, setForm] = useState<FormState>(() => fromOrg(org))
  // Errors are shown for fields the user has changed (not for an empty new profile).
  const [touched, setTouched] = useState<Set<keyof FormState>>(new Set())
  const [logoError, setLogoError] = useState<string>()
  const logoUrl = useObjectUrl(form.logo)
  const preset = useLiveQuery(() => getDefaultEquipmentPreset(db, org.id), [org.id])
  const readOnly = !useCloudRights().isAdmin
  const requests = usePendingRequests()

  const allErrors = validate(form)
  const valid = !Object.values(allErrors).some(Boolean)
  const errors = Object.fromEntries(
    Object.entries(allErrors).filter(([k]) => touched.has(k as keyof FormState)),
  ) as Partial<Record<keyof FormState, string>>

  const set = (key: keyof FormState) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setTouched((t) => new Set(t).add(key))
  }

  const onLogo = async (file: File | undefined) => {
    setLogoError(undefined)
    if (!file) return
    try {
      const logo = await toStoredFile(await resizeImage(file, 800, 'image/png'), 'image/png')
      setForm((f) => ({ ...f, logo }))
    } catch {
      setLogoError('Das Bild konnte nicht gelesen werden. Bitte PNG, JPG oder SVG verwenden.')
    }
  }

  const state = useAutosave(
    form,
    (f) =>
      saveOrganization(db, org.id, {
        name: f.name.trim(),
        numberPrefix: f.numberPrefix.trim().toUpperCase(),
        street: f.street.trim() || undefined,
        postalCode: f.postalCode.trim() || undefined,
        city: f.city.trim() || undefined,
        phone: f.phone.trim() || undefined,
        email: f.email.trim() || undefined,
        reportEmails: parseEmailList(f.reportEmails),
        taxNumber: f.taxNumber.trim() || undefined,
        logo: f.logo,
        ...f.appearance,
      }),
    { enabled: valid && !readOnly },
  )

  return (
    <div>
      <PageHeader title="Firma" back="/profile" backLabel="Profile" />
      <div className="space-y-4">
        <Link
          to="/profile/firma/cloud"
          className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 border-brand-700 bg-white px-4 py-2 dark:border-brand-300 dark:bg-stone-900"
        >
          <span>
            <span className="block font-semibold">Firmen-Kartei (Cloud)</span>
            <span className="block text-sm text-stone-600 dark:text-stone-400">
              Daten mit allen Geräten der Firma teilen, Mitarbeiter einladen
            </span>
            {requests > 0 && (
              <span className="mt-1 inline-block rounded-md bg-amber-500 px-2 py-0.5 text-sm font-semibold text-black">
                {requests} {requests === 1 ? 'Beitrittsanfrage wartet' : 'Beitrittsanfragen warten'}
              </span>
            )}
          </span>
          <span aria-hidden="true" className="text-2xl text-stone-400">
            ›
          </span>
        </Link>
        {readOnly && (
          <ReadOnlyNotice text="Firmendaten, Logo und Nummern können nur Admins der Firma ändern." />
        )}
        <fieldset disabled={readOnly} className="space-y-4">
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
                  <Button
                    variant="secondary"
                    onClick={() => setForm((f) => ({ ...f, logo: undefined }))}
                  >
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

          <AppearanceCard
            org={org}
            logo={form.logo}
            value={form.appearance}
            onChange={(appearance) => setForm((f) => ({ ...f, appearance }))}
          />

          <NumberingCard prefix={form.numberPrefix} savedPrefix={org.numberPrefix} />
        </fieldset>
        <Card title="Standard-Ausrüstung">
          <p className="mb-3 text-stone-700 dark:text-stone-300">
            Wird bei jedem neuen Einsatz vorbelegt und vor Ort bestätigt.
          </p>
          <Link
            to="/profile/ausruestung"
            className="flex min-h-12 items-center justify-between rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600"
          >
            {preset
              ? `${Object.keys(preset.answers).length} von ${equipmentItems.length} Punkten vorbelegt`
              : 'Noch nichts vorbelegt'}
            <span aria-hidden="true">›</span>
          </Link>
        </Card>

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
      <SaveStatus
        state={state}
        hint={
          valid
            ? undefined
            : allErrors.name
              ? 'Firmenname eingeben – dann wird automatisch gespeichert.'
              : 'Bitte die markierten Felder korrigieren – dann wird gespeichert.'
        }
      />
    </div>
  )
}
