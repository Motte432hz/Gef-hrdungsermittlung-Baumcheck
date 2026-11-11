import type { Company, ID, Worker } from '../domain/types'

const key = (s: string) => s.trim().toLocaleLowerCase('de')

/**
 * Links subcontractors without companyId to company records by their free-text company
 * name (case-insensitive). Reuses `existing` companies of the same organization and returns
 * the companies that have to be created plus the worker → company links.
 */
export function groupCompanies(
  workers: Worker[],
  existing: Company[],
): { companies: Company[]; links: [ID, Company][] } {
  const byKey = new Map(existing.map((c) => [`${c.organizationId}|${key(c.name)}`, c]))
  const created: Company[] = []
  const links: [ID, Company][] = []
  for (const w of workers) {
    if (w.kind !== 'subcontractor' || w.companyId || !w.company?.trim() || w.deletedAt) continue
    const k = `${w.organizationId}|${key(w.company)}`
    let c = byKey.get(k)
    if (!c) {
      const now = new Date().toISOString()
      c = {
        id: crypto.randomUUID(),
        organizationId: w.organizationId,
        createdAt: now,
        updatedAt: now,
        syncState: 'pending',
        name: w.company.trim(),
      }
      byKey.set(k, c)
      created.push(c)
    }
    links.push([w.id, c])
  }
  return { companies: created, links }
}

export const sameCompanyName = (a: string, b: string) => key(a) === key(b)
