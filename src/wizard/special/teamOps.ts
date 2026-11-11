import { newId } from '../../db/repo'
import type { Qualification, QualificationType, Role, TeamMember, Worker } from '../../domain/types'

export function memberFromWorker(w: Worker, roles: Role[] = []): TeamMember {
  return {
    id: newId(),
    workerId: w.id,
    kind: w.kind,
    name: w.name,
    nickname: w.nickname,
    company: w.company,
    // Snapshot: later profile changes do not alter this assessment.
    qualifications: structuredClone(w.qualifications),
    gear: w.gear ? structuredClone(w.gear) : undefined,
    roles,
  }
}

/** Makes `memberId` the only supervisor of the team. */
export function assignSupervisor(team: TeamMember[], memberId: string): TeamMember[] {
  return team.map((m) => {
    const others = m.roles.filter((r) => r !== 'supervisor')
    return m.id === memberId ? { ...m, roles: ['supervisor', ...others] } : { ...m, roles: others }
  })
}

export function toggleRole(
  team: TeamMember[],
  memberId: string,
  role: Role,
  on: boolean,
): TeamMember[] {
  return team.map((m) =>
    m.id !== memberId
      ? m
      : { ...m, roles: on ? [...new Set([...m.roles, role])] : m.roles.filter((r) => r !== role) },
  )
}

const SKT: QualificationType[] = ['skt_a', 'skt_b', 'skt_k']

/**
 * Role proposal for a person joining the team: the first person supervises; with rope access,
 * people with an SKT qualification climb; everyone else works on the ground.
 */
export function suggestRoles(
  team: Pick<TeamMember, 'roles'>[],
  qualifications: Pick<Qualification, 'type'>[],
  jobTypes: string[],
): Role[] {
  if (!team.some((m) => m.roles.includes('supervisor'))) return ['supervisor']
  const climbs =
    jobTypes.includes('rope_access') && qualifications.some((q) => SKT.includes(q.type))
  return [climbs ? 'climber' : 'ground']
}

/** Adds saved people one after another, each with a role proposal. */
export function addWorkers(team: TeamMember[], workers: Worker[], jobTypes: string[]) {
  let next = team
  for (const w of workers)
    next = [...next, memberFromWorker(w, suggestRoles(next, w.qualifications, jobTypes))]
  return next
}

/** Subcontractor companies with at least two people that are not yet in the team. */
export function companyGroups(workers: Worker[]): { company: string; workers: Worker[] }[] {
  const groups = new Map<string, Worker[]>()
  for (const w of workers) {
    const c = w.kind === 'subcontractor' ? w.company?.trim() : undefined
    if (!c) continue
    const key = c.toLocaleLowerCase('de')
    groups.set(key, [...(groups.get(key) ?? []), w])
  }
  return [...groups.values()]
    .filter((ws) => ws.length >= 2)
    .map((ws) => ({ company: ws[0]!.company!.trim(), workers: ws }))
    .sort((a, b) => a.company.localeCompare(b.company, 'de'))
}

/** Case- and accent-insensitive search text. */
export const searchKey = (s: string) =>
  s
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
