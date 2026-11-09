import type { Assessment, Customer } from '../domain/types'

export function formatDateDe(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** Short title for lists: customer / object, else address, else a generic name. */
export function assessmentTitle(a: Assessment, customers: Customer[]): string {
  const customer = customers.find((c) => c.id === a.customerId)
  const site = customer?.sites.find((s) => s.id === a.siteId)
  if (customer) return site ? `${customer.name} – ${site.name}` : customer.name
  const address = a.answers['site.address']?.value
  if (typeof address === 'string' && address.trim()) return address.split('\n')[0]!.trim()
  return 'Einsatz ohne Kunde'
}
