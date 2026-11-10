import { normalizeSearch, speciesLabel } from '../form/species'
import type { Assessment, Customer, Tree } from '../domain/types'

/** Text that a protocol can be found by: number, customer/object, address, people, species. */
export function searchText(a: Assessment, customers: Customer[], trees: Tree[]): string {
  const c = customers.find((x) => x.id === a.customerId)
  const site = c?.sites.find((s) => s.id === a.siteId)
  const address = a.answers['site.address']?.value
  return normalizeSearch(
    [
      a.protocolNumber,
      c?.name,
      site?.name,
      site?.street,
      site?.city,
      typeof address === 'string' ? address : '',
      ...a.team.map((m) => `${m.name} ${m.nickname ?? ''} ${m.company ?? ''}`),
      ...trees.map((t) => speciesLabel(t.answers['tree.species']) ?? ''),
    ]
      .filter(Boolean)
      .join(' '),
  )
}

/** All words of the query must occur (any order). */
export function matches(text: string, query: string): boolean {
  const words = normalizeSearch(query).split(' ').filter(Boolean)
  return words.every((w) => text.includes(w))
}
