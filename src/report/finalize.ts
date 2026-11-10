import type { BaumCheckDB } from '../db/db'
import {
  completeAssessment,
  getSignatures,
  getTrees,
  NumberConflictError,
  peekProtocolNumber,
} from '../db/repo'
import type { Assessment } from '../domain/types'
import { getDefinition } from '../form/definition'
import { canComplete, validateAssessment } from '../form/validation'
import { buildProtocolPdf } from '../pdf/protocolPdf'
import type { FontBytes } from '../pdf/writer'
import { sha256Hex } from '../lib/hash'
import { assessmentContentHash } from './contentHash'
import { allSigned, requiredSignatures } from './signatures'

export class NotReadyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotReadyError'
  }
}

/** Short device description stored with the protocol (no personal data). */
export function deviceInfo(): string {
  const ua = navigator.userAgent
  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'unbekannt'
  const standalone =
    typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches
      ? 'App'
      : 'Browser'
  return `${os} · ${standalone} · ${ua.slice(0, 160)}`
}

/**
 * Completes an assessment: checks it is complete and signed, builds the PDF with the
 * final protocol number, hashes it and locks everything in one transaction.
 */
export async function finalizeAssessment(
  db: BaumCheckDB,
  assessmentId: string,
  fonts: FontBytes,
): Promise<Assessment> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const assessment = await db.assessments.get(assessmentId)
    if (!assessment) throw new Error('not found')
    const definition = getDefinition(assessment.formVersion)
    const [trees, signatures, attachments, organization] = await Promise.all([
      getTrees(db, assessmentId),
      getSignatures(db, assessmentId),
      db.attachments.where('assessmentId').equals(assessmentId).toArray(),
      db.organizations.get(assessment.organizationId),
    ])
    const customer = assessment.customerId
      ? await db.customers.get(assessment.customerId)
      : undefined
    const photos = attachments
      .filter((x) => x.kind === 'tree_photo' && x.treeId)
      .sort((x, y) => x.capturedAt.localeCompare(y.capturedAt))
    const photoIds: Record<string, string[]> = {}
    for (const p of photos) (photoIds[p.treeId!] ??= []).push(p.id)

    if (!canComplete(validateAssessment({ definition, assessment, trees }))) {
      throw new NotReadyError('Es sind noch Punkte offen.')
    }
    const contentHash = await assessmentContentHash(assessment, trees, photoIds)
    if (
      !allSigned(
        requiredSignatures(assessment.team, assessment.supervisorMemberId, signatures, contentHash),
      )
    ) {
      throw new NotReadyError('Es fehlen Unterschriften oder sie sind veraltet.')
    }

    const protocolNumber = await peekProtocolNumber(db, assessmentId)
    const completedAt = new Date().toISOString()
    const pdf = await buildProtocolPdf(
      {
        definition,
        organization: organization!,
        assessment,
        protocolNumber,
        completedAt,
        trees,
        customer,
        signatures,
        photos: photos.map((p) => ({ treeId: p.treeId!, file: p.file })),
        contentHash,
        layout: organization?.pdfLayout,
        brandColor: organization?.brandInPdf ? organization.brandColor : undefined,
        brandColor2: organization?.brandInPdf ? organization.brandColor2 : undefined,
      },
      fonts,
    )
    const data = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer
    try {
      return await completeAssessment(db, assessmentId, {
        contentHash,
        pdfHash: await sha256Hex(pdf),
        deviceInfo: deviceInfo(),
        expectedNumber: protocolNumber,
        completedAt,
        pdf: { type: 'application/pdf', data },
      })
    } catch (e) {
      // Another protocol took the number meanwhile: rebuild the PDF with the next one.
      if (!(e instanceof NumberConflictError)) throw e
    }
  }
  throw new Error('Protokollnummer konnte nicht vergeben werden.')
}
