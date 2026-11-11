import { useId } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { listCustomers } from '../../db/profiles'
import type { SpecialItem } from '../../form/schema'
import type { Customer, CustomerSite } from '../../domain/types'
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

  /** Pre-fills the address of step 2 if it is still empty. */
  const prefillAddress = async (c: Customer | undefined, s: CustomerSite | undefined) => {
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
          Noch keine Kunden gespeichert.{' '}
          <Link
            to="/profile/kunden/neu"
            className="font-semibold text-brand-700 underline dark:text-brand-300"
          >
            Kunden anlegen
          </Link>{' '}
          (optional)
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
      {customer && <PreviousVisitCard />}
    </ItemCard>
  )
}
