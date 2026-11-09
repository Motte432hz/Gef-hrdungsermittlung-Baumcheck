import { newId } from '../../db/repo'
import type { Role, TeamMember, Worker } from '../../domain/types'

export function memberFromWorker(w: Worker, roles: Role[] = []): TeamMember {
  return {
    id: newId(),
    workerId: w.id,
    kind: w.kind,
    name: w.name,
    company: w.company,
    // Snapshot: later profile changes do not alter this assessment.
    qualifications: structuredClone(w.qualifications),
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
