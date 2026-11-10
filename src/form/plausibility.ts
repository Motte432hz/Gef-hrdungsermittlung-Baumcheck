import type { Assessment, GearItem, Qualification, TeamMember } from '../domain/types'
import { QUALIFICATION_LABELS } from '../domain/types'
import type { Issue } from './validation'
import { personLabel } from '../domain/people'

const SKT_QUALIFICATIONS = new Set(['skt_a', 'skt_b', 'skt_k'])
export const EXPIRY_NOTICE_DAYS = 30

export const hasSktQualification = (m: TeamMember) =>
  m.qualifications.some((q) => SKT_QUALIFICATIONS.has(q.type))

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000)
}

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function jobTypes(a: Pick<Assessment, 'answers'>): string[] {
  const v = a.answers['job.types']?.value
  return Array.isArray(v) ? v : []
}

/** Team plausibility checks. Never blocking – they are hints for the supervisor. */
export function checkTeam(
  a: Pick<Assessment, 'answers' | 'team' | 'date'>,
  stepId: string,
): Issue[] {
  const out: Issue[] = []
  const types = jobTypes(a)
  const team = a.team
  if (team.length === 0) return out

  if (types.includes('rope_access')) {
    const skt = team.filter(hasSktQualification).length
    const ground = team.some((m) => m.roles.includes('ground'))
    if (skt < 2 || !ground) {
      out.push({
        key: 'team:skt',
        level: 'warning',
        stepId,
        itemId: 'team.members',
        message: `Für Seilklettertechnik müssen mindestens 2 Personen mit SKT-Qualifikation und eine Bodenperson eingeteilt sein (aktuell: ${skt} mit SKT, ${ground ? 'Bodenperson eingeteilt' : 'keine Bodenperson'}).`,
      })
    }
  }

  if (
    types.includes('aerial_platform') &&
    !team.some((m) => m.roles.includes('platform_operator'))
  ) {
    out.push({
      key: 'team:platform',
      level: 'info',
      stepId,
      itemId: 'team.members',
      message: 'Hubarbeitsbühne gewählt, aber niemand ist als Bediener/in eingeteilt.',
    })
  }
  if (types.includes('crane') && !team.some((m) => m.roles.includes('crane_signaller'))) {
    out.push({
      key: 'team:crane',
      level: 'info',
      stepId,
      itemId: 'team.members',
      message: 'Kran gewählt, aber niemand ist als Anschläger/in bzw. Einweiser/in eingeteilt.',
    })
  }

  for (const m of team) {
    if (m.roles.length === 0) {
      out.push({
        key: `team:${m.id}:roles`,
        level: 'warning',
        stepId,
        itemId: 'team.members',
        message: `${personLabel(m)} hat noch keine Rolle.`,
      })
    }
    for (const q of m.qualifications) out.push(...checkExpiry(m, q, a.date, stepId))
    for (const g of m.gear ?? []) out.push(...checkInspection(m, g, a.date, stepId))
  }
  return out
}

function checkExpiry(m: TeamMember, q: Qualification, date: string, stepId: string): Issue[] {
  if (!q.validUntil) return []
  const label = QUALIFICATION_LABELS[q.type]
  const days = daysBetween(date, q.validUntil)
  if (days < 0) {
    return [
      {
        key: `team:${m.id}:${q.type}:expired`,
        level: 'warning',
        stepId,
        itemId: 'team.members',
        message: `Nachweis ${label} von ${personLabel(m)} ist seit ${formatDate(q.validUntil)} abgelaufen.`,
      },
    ]
  }
  if (days <= EXPIRY_NOTICE_DAYS) {
    return [
      {
        key: `team:${m.id}:${q.type}:expiring`,
        level: 'info',
        stepId,
        itemId: 'team.members',
        message: `Nachweis ${label} von ${personLabel(m)} läuft am ${formatDate(q.validUntil)} ab.`,
      },
    ]
  }
  return []
}

/** Inspection dates of PPE (e.g. yearly check of fall protection by a competent person). */
function checkInspection(m: TeamMember, g: GearItem, date: string, stepId: string): Issue[] {
  if (!g.nextInspection) return []
  const days = daysBetween(date, g.nextInspection)
  const base = { stepId, itemId: 'team.members' }
  if (days < 0) {
    return [
      {
        ...base,
        key: `team:${m.id}:gear:${g.id}:overdue`,
        level: 'warning',
        message: `Prüfung von ${g.name} (${personLabel(m)}) war am ${formatDate(g.nextInspection)} fällig.`,
      },
    ]
  }
  if (days <= EXPIRY_NOTICE_DAYS) {
    return [
      {
        ...base,
        key: `team:${m.id}:gear:${g.id}:due`,
        level: 'info',
        message: `Prüfung von ${g.name} (${personLabel(m)}) ist am ${formatDate(g.nextInspection)} fällig.`,
      },
    ]
  }
  return []
}
