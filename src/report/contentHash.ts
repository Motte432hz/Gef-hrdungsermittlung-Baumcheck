import type { Assessment, Tree } from '../domain/types'
import { canonicalJson, sha256Hex } from '../lib/hash'

export type HashableAssessment = Pick<
  Assessment,
  | 'id'
  | 'formVersion'
  | 'version'
  | 'date'
  | 'customerId'
  | 'siteId'
  | 'team'
  | 'supervisorMemberId'
  | 'position'
  | 'answers'
>

/**
 * Hash over everything that was assessed and signed for: answers, team, location, trees and
 * photo ids. Signatures store it; any later change makes them visibly outdated. Excludes
 * bookkeeping fields (timestamps, sync state) so saving the same data keeps the hash stable.
 */
export async function assessmentContentHash(
  a: HashableAssessment,
  trees: Pick<Tree, 'id' | 'index' | 'answers'>[],
  photoIdsByTree: Record<string, string[]> = {},
): Promise<string> {
  const payload = {
    id: a.id,
    formVersion: a.formVersion,
    version: a.version,
    date: a.date,
    customerId: a.customerId ?? null,
    siteId: a.siteId ?? null,
    supervisorMemberId: a.supervisorMemberId ?? null,
    team: a.team,
    position: a.position
      ? { lat: a.position.lat, lng: a.position.lng, accuracy: a.position.accuracy }
      : null,
    answers: a.answers,
    trees: [...trees]
      .sort((x, y) => x.index - y.index)
      .map((t) => ({
        id: t.id,
        index: t.index,
        answers: t.answers,
        photos: [...(photoIdsByTree[t.id] ?? [])].sort(),
      })),
  }
  return sha256Hex(canonicalJson(payload))
}
