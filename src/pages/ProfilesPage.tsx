import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getDefaultEquipmentPreset, listCustomers, listWorkers } from '../db/profiles'
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
    const [employees, subs, customers, preset] = await Promise.all([
      listWorkers(db, org.id, 'employee'),
      listWorkers(db, org.id, 'subcontractor'),
      listCustomers(db, org.id),
      getDefaultEquipmentPreset(db, org.id),
    ])
    return {
      employees: employees.length,
      subs: subs.length,
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
          to="/profile/mitarbeiter"
          title="Mitarbeiter"
          meta={count(stats?.employees, 'Person', 'Personen')}
        />
        <ListLink
          to="/profile/subunternehmer"
          title="Subunternehmer"
          meta={count(stats?.subs, 'Person', 'Personen')}
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
