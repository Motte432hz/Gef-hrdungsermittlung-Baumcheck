import { useLiveQuery } from 'dexie-react-hooks'
import type { BaumCheckDB } from '../db/db'
import { db as appDb } from '../db/db'
import { getDefaultEquipmentPreset, listWorkers } from '../db/profiles'
import { META_CURRENT_ORG } from '../db/repo'
import { META_LAST_BACKUP } from '../backup/backup'
import { META_CLOUD, type CloudLink } from '../cloud/syncManager'

/** Checklist on the start page: what a new company should set up first. */
export interface SetupItem {
  id: 'company' | 'logo' | 'team' | 'equipment' | 'safety' | 'first'
  title: string
  hint: string
  done: boolean
  /** Where to do it. */
  to: string
}

export interface SetupStatus {
  items: SetupItem[]
  done: number
  /** Nothing set up yet: a brand-new installation. */
  fresh: boolean
  /** Checklist hidden by the user. */
  dismissed: boolean
  /** Members of a cloud company do not set up the company. */
  member: boolean
}

export const META_SETUP_DISMISSED = 'setupDismissed'

export async function setupStatus(db: BaumCheckDB): Promise<SetupStatus | undefined> {
  const orgId = (await db.meta.get(META_CURRENT_ORG))?.value as string | undefined
  const org = orgId ? await db.organizations.get(orgId) : undefined
  if (!org) return undefined
  const [workers, preset, backup, cloud, dismissed, assessments] = await Promise.all([
    listWorkers(db, org.id),
    getDefaultEquipmentPreset(db, org.id),
    db.meta.get(META_LAST_BACKUP),
    db.meta.get(META_CLOUD),
    db.meta.get(META_SETUP_DISMISSED),
    db.assessments.where('organizationId').equals(org.id).toArray(),
  ])
  const link = cloud?.value as CloudLink | undefined
  const items: SetupItem[] = [
    {
      id: 'company',
      title: 'Firmendaten eintragen',
      hint: 'Name, Adresse und Telefon stehen auf jedem PDF.',
      done: !!org.name.trim() && !!(org.phone || org.email || org.city),
      to: '/einrichtung/firma',
    },
    {
      id: 'logo',
      title: 'Logo hochladen',
      hint: 'Erscheint oben auf jedem Protokoll.',
      done: !!org.logo,
      to: '/einrichtung/firma',
    },
    {
      id: 'team',
      title: 'Team anlegen',
      hint: 'Mitarbeiter mit Qualifikationen – im Einsatz nur noch antippen.',
      done: workers.length > 0,
      to: '/einrichtung/team',
    },
    {
      id: 'equipment',
      title: 'Standard-Ausrüstung festlegen',
      hint: 'Wird in jedem Einsatz vorbelegt.',
      done: Object.keys(preset?.answers ?? {}).length > 0,
      to: '/einrichtung/ausruestung',
    },
    {
      id: 'safety',
      title: 'Daten sichern',
      hint: 'Firmen-Kartei (Cloud) einrichten oder ein Backup erstellen.',
      done: !!link || !!backup,
      to: '/einrichtung/sicherung',
    },
    {
      id: 'first',
      title: 'Übungseinsatz ausprobieren',
      hint: 'Einmal durchspielen – ohne Nummer, ohne Archiv.',
      done: assessments.some((a) => a.status !== 'draft'),
      to: '/einrichtung/fertig',
    },
  ]
  return {
    items,
    done: items.filter((i) => i.done).length,
    fresh: items.every((i) => !i.done) && assessments.length === 0 && !org.name.trim(),
    dismissed: !!dismissed,
    member: !!link && link.role === 'member',
  }
}

export function useSetupStatus(): SetupStatus | undefined {
  return useLiveQuery(() => setupStatus(appDb), [])
}

/** Steps of the setup assistant. Each one saves right away and can be skipped. */
export const SETUP_STEPS = [
  { id: 'firma', title: 'Deine Firma' },
  { id: 'ich', title: 'Du selbst' },
  { id: 'team', title: 'Dein Team' },
  { id: 'ausruestung', title: 'Ausrüstung' },
  { id: 'sicherung', title: 'Daten sichern' },
  { id: 'fertig', title: 'Fertig' },
] as const

export const META_SETUP_SELF = 'setupSelfWorkerId'

/** "Zwieselwiesel Baumpflege" → "ZB". */
export function suggestPrefix(name: string): string {
  const words = name
    .replace(/\b(GmbH|UG|GbR|KG|OHG|AG|e\.?\s?K\.?|Inh\.?)\b/gi, '')
    .split(/[\s&\-+]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
  if (words.length === 0) return ''
  const initials = words.length === 1 ? words[0]!.slice(0, 2) : words.map((w) => w[0]).join('')
  return initials.slice(0, 4).toUpperCase()
}
