import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  getDefaultEquipmentPreset,
  listCompanies,
  listCustomers,
  listWorkers,
} from '../db/profiles'
import { useOrganization } from '../app/useOrganization'
import { PageHeader } from '../components/PageHeader'
import { LinkList, ListLink } from '../components/ListLink'
import { equipmentItems } from './profiles/equipmentItems'

const count = (n: number | undefined, one: string, many: string) =>
  n === undefined ? '…' : n === 0 ? `Noch keine ${many}` : `${n} ${n === 1 ? one : many}`

export function ProfilesPage() {
  const org = useOrganization()
  const stats = useLiveQuery(async () => {
    if (!org) return undefined
    const [employees, subs, companies, customers, preset] = await Promise.all([
      listWorkers(db, org.id, 'employee'),
      listWorkers(db, org.id, 'subcontractor'),
      listCompanies(db, org.id),
      listCustomers(db, org.id),
      getDefaultEquipmentPreset(db, org.id),
    ])
    return {
      employees: employees.length,
      subs: subs.length,
      companies: companies.length,
      customers: customers.length,
      presetCount: preset ? Object.keys(preset.answers).length : 0,
    }
  }, [org?.id])

  return (
    <div>
      <PageHeader title="Profile" />
      <LinkList>
        <ListLink
          to="/profile/firma"
          title="Firma"
          meta={org?.name ? org.name : 'Noch nicht eingerichtet – Logo und Firmendaten für das PDF'}
        />
        <ListLink
          to="/profile/team"
          title="Team & Partner"
          meta={
            stats
              ? stats.employees + stats.subs === 0
                ? 'Mitarbeiter und Subunternehmer anlegen'
                : `${stats.employees} eigene · ${stats.subs} Subunternehmer${stats.companies ? ` (${stats.companies} ${stats.companies === 1 ? 'Firma' : 'Firmen'})` : ''}`
              : '…'
          }
        />
        <ListLink
          to="/profile/ausruestung"
          title="Standard-Ausrüstung"
          meta={stats ? `${stats.presetCount} von ${equipmentItems.length} Punkten vorbelegt` : '…'}
        />
        <ListLink
          to="/profile/kunden"
          title="Kunden und Objekte"
          meta={count(stats?.customers, 'Kunde', 'Kunden')}
        />
      </LinkList>
    </div>
  )
}
