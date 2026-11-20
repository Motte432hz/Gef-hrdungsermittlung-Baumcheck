import { db } from '../../db/db'
import { addSignature, removeSignatures } from '../../db/repo'
import type { GeoPosition, Signature, StoredFile } from '../../domain/types'
import type { RequiredSignature } from '../../report/signatures'
import { toStoredFile } from '../../lib/storedFile'

/** Stores a signature with the position found so far (never waits longer than a moment). */
export async function saveSignature({
  assessmentId,
  req,
  image,
  method,
  confirmedBy,
  contentHash,
  position,
}: {
  assessmentId: string
  req: RequiredSignature
  image: Blob | StoredFile
  method: Signature['method']
  confirmedBy?: string
  contentHash: string
  position?: Promise<GeoPosition | undefined>
}) {
  const file = image instanceof Blob ? await toStoredFile(image, 'image/png') : image
  const pos = await Promise.race([
    position ?? Promise.resolve(undefined),
    new Promise<undefined>((r) => setTimeout(() => r(undefined), 800)),
  ])
  // An outdated signature is replaced.
  if (req.signature) await removeSignatures(db, assessmentId, req.member.id, req.statement)
  await addSignature(db, assessmentId, {
    memberId: req.member.id,
    name: req.member.name,
    roles: req.member.roles,
    statement: req.statement,
    method,
    confirmedBy,
    image: file,
    signedAt: new Date().toISOString(),
    position: pos,
    contentHash,
  })
}
