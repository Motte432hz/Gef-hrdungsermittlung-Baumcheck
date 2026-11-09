import type { Signature, TeamMember } from '../domain/types'

export interface RequiredSignature {
  member: TeamMember
  statement: 'supervisor' | 'member'
  signature?: Signature
  /** Signed, but the content changed afterwards. */
  outdated: boolean
}

/**
 * Who has to sign: the supervisor (assessment statement) and every other team member
 * (instruction statement). Only the newest signature per member and statement counts.
 */
export function requiredSignatures(
  team: TeamMember[],
  supervisorMemberId: string | undefined,
  signatures: Signature[],
  currentHash: string | undefined,
): RequiredSignature[] {
  const latest = (memberId: string, statement: Signature['statement']) =>
    signatures
      .filter((s) => s.memberId === memberId && s.statement === statement)
      .sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0]

  const supervisor = team.find((m) => m.id === supervisorMemberId)
  const list: { member: TeamMember; statement: 'supervisor' | 'member' }[] = [
    ...(supervisor ? [{ member: supervisor, statement: 'supervisor' as const }] : []),
    ...team
      .filter((m) => m.id !== supervisorMemberId)
      .map((member) => ({ member, statement: 'member' as const })),
  ]
  return list.map(({ member, statement }) => {
    const signature = latest(member.id, statement)
    return {
      member,
      statement,
      signature,
      outdated: !!signature && !!currentHash && signature.contentHash !== currentHash,
    }
  })
}

export const allSigned = (req: RequiredSignature[]) =>
  req.length > 0 && req.every((r) => r.signature && !r.outdated)

/** How the signature was made – printed next to it (PDF and summary). */
export function signatureMethodText(s: Pick<Signature, 'method' | 'confirmedBy'>): string {
  return s.method === 'drawn'
    ? 'vor Ort unterschrieben'
    : `hinterlegte Unterschrift übernommen${s.confirmedBy ? `, bestätigt durch ${s.confirmedBy}` : ''}`
}
