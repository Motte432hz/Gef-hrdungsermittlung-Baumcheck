import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { listCustomers, saveCustomer } from '../../db/profiles'
import { newId } from '../../db/repo'
import { Button } from '../../components/Button'
import { TextField } from '../../components/form/Field'
import type { SpecialItem } from '../../form/schema'
import type { CustomerSite } from '../../domain/types'
import { useWizard } from '../WizardContext'
import { ItemLabel } from '../inputs/InfoButton'
import { ItemCard } from '../inputs/ItemCard'
import { selectClass } from './selectClass'
import { formatAddress } from '../../domain/address'
import { PreviousVisitCard } from './PreviousVisitCard'

export function CustomerField({ item }: { item: SpecialItem }) {
  const { assessment, update, setAnswer } = useWizard()
  const customerId = useId()
  const siteId = useId()
  const customers = useLiveQuery(
    () => listCustomers(db, assessment.organizationId),
    [assessment.organizationId],
  )
  const customer = customers?.find((c) => c.id === assessment.customerId)
  const site = customer?.sites.find((s) => s.id === assessment.siteId)
  const [creating, setCreating] = useState<'none' | 'customer' | 'site'>('none')

  /** Pre-fills the address of step 2 if it is still empty. */
  type Place = Parameters<typeof formatAddress>[0]
  const prefillAddress = async (c: Place | undefined, s: Place | undefined) => {
    const address = formatAddress(s ?? c ?? {})
    if (address && !assessment.answers['site.address']?.value) {
      await setAnswer('site.address', { value: address })
    }
  }

  const chooseCustomer = async (id: string) => {
    const c = customers?.find((x) => x.id === id)
    const onlySite = c?.sites.length === 1 ? c.sites[0] : undefined
    await update({ customerId: c?.id, siteId: onlySite?.id })
    await prefillAddress(c, onlySite)
  }

  const chooseSite = async (id: string) => {
    const s = customer?.sites.find((x) => x.id === id)
    await update({ siteId: s?.id })
    await prefillAddress(customer, s)
  }

  return (
    <ItemCard>
      <ItemLabel as="label" htmlFor={customerId} label={item.label} info={item.info} />
      {customers && customers.length === 0 ? (
        <p className="text-stone-600 dark:text-stone-400">
          Noch keine Kunden gespeichert (optional).
        </p>
      ) : (
        <select
          id={customerId}
          className={selectClass}
          value={assessment.customerId ?? ''}
          onChange={(e) => void chooseCustomer(e.target.value)}
        >
          <option value="">– ohne Kunde –</option>
          {customers?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {customer && customer.sites.length > 0 && (
        <div className="space-y-1">
          <label htmlFor={siteId} className="block font-semibold">
            Objekt
          </label>
          <select
            id={siteId}
            className={selectClass}
            value={assessment.siteId ?? ''}
            onChange={(e) => void chooseSite(e.target.value)}
          >
            <option value="">– kein bestimmtes Objekt –</option>
            {customer.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {site && (formatAddress(site) || site.notes) && (
        <div className="rounded-xl bg-stone-100 p-3 dark:bg-stone-800">
          {formatAddress(site) && <p>{formatAddress(site)}</p>}
          {site.notes && (
            <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
              Hinweise: {site.notes}
            </p>
          )}
        </div>
      )}
      {creating === 'customer' && (
        <QuickPlaceForm
          title="Neuer Kunde"
          nameLabel="Name des Kunden"
          withSiteName
          onCancel={() => setCreating('none')}
          onSave={async (f) => {
            const site: CustomerSite | undefined = f.siteName
              ? {
                  id: newId(),
                  name: f.siteName,
                  street: f.street,
                  postalCode: f.postalCode,
                  city: f.city,
                }
              : undefined
            const id = await saveCustomer(db, assessment.organizationId, {
              name: f.name,
              ...(site ? {} : { street: f.street, postalCode: f.postalCode, city: f.city }),
              sites: site ? [site] : [],
            })
            await update({ customerId: id, siteId: site?.id })
            await prefillAddress(f, site)
            setCreating('none')
          }}
        />
      )}
      {creating === 'site' && customer && (
        <QuickPlaceForm
          title={`Neues Objekt für ${customer.name}`}
          nameLabel="Bezeichnung des Objekts"
          onCancel={() => setCreating('none')}
          onSave={async (f) => {
            const site: CustomerSite = {
              id: newId(),
              name: f.name,
              street: f.street,
              postalCode: f.postalCode,
              city: f.city,
            }
            const { name, contactPerson, phone, email, street, postalCode, city, sites } = customer
            await saveCustomer(
              db,
              assessment.organizationId,
              {
                name,
                contactPerson,
                phone,
                email,
                street,
                postalCode,
                city,
                sites: [...sites, site],
              },
              customer.id,
            )
            await update({ siteId: site.id })
            await prefillAddress(customer, site)
            setCreating('none')
          }}
        />
      )}
      {creating === 'none' && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setCreating('customer')}>
            + Neuer Kunde
          </Button>
          {customer && (
            <Button variant="secondary" onClick={() => setCreating('site')}>
              + Neues Objekt
            </Button>
          )}
        </div>
      )}
      {customer && <PreviousVisitCard />}
    </ItemCard>
  )
}

interface PlaceInput {
  name: string
  siteName?: string
  street?: string
  postalCode?: string
  city?: string
}

/** Short form for a new customer or object, right inside the wizard. */
function QuickPlaceForm({
  title,
  nameLabel,
  withSiteName,
  onSave,
  onCancel,
}: {
  title: string
  nameLabel: string
  withSiteName?: boolean
  onSave: (input: PlaceInput) => Promise<void>
  onCancel: () => void
}) {
  const [f, setF] = useState<PlaceInput>({ name: '' })
  const [error, setError] = useState<string>()
  const set = (k: keyof PlaceInput) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value })
  const clean = (v?: string) => v?.trim() || undefined

  const submit = async () => {
    if (!f.name.trim()) return setError(`${nameLabel} ist ein Pflichtfeld.`)
    await onSave({
      name: f.name.trim(),
      siteName: clean(f.siteName),
      street: clean(f.street),
      postalCode: clean(f.postalCode),
      city: clean(f.city),
    })
  }

  return (
    <div className="space-y-3 rounded-xl border-2 border-brand-700 p-3">
      <p className="font-semibold">{title}</p>
      <TextField label={nameLabel} required value={f.name} onChange={set('name')} error={error} />
      {withSiteName && (
        <TextField
          label="Objekt (optional)"
          hint="Z. B. „Wohnanlage Lindenstraße“, wenn der Kunde mehrere Objekte hat."
          value={f.siteName ?? ''}
          onChange={set('siteName')}
        />
      )}
      <TextField
        label="Straße und Hausnummer"
        value={f.street ?? ''}
        onChange={set('street')}
        autoComplete="street-address"
      />
      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <TextField
          label="PLZ"
          inputMode="numeric"
          value={f.postalCode ?? ''}
          onChange={set('postalCode')}
          autoComplete="postal-code"
        />
        <TextField
          label="Ort"
          value={f.city ?? ''}
          onChange={set('city')}
          autoComplete="address-level2"
        />
      </div>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Wird unter Profile › Kunden gespeichert und steht beim nächsten Einsatz zur Auswahl.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void submit()}>Speichern und auswählen</Button>
        <Button variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
