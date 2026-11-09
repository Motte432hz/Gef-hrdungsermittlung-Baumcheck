// @vitest-environment node
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB, LockedError } from '../db/db'
import {
  addSignature,
  addTree,
  createAssessment,
  ensureOrganization,
  getProtocolPdf,
  setAnswer,
  updateAssessment,
} from '../db/repo'
import { currentDefinition as def } from '../form/definition'
import { fillAnswers, member } from '../test/fixtures'
import { finalizeAssessment, NotReadyError } from './finalize'
import { assessmentContentHash } from './contentHash'
import { sha256Hex } from '../lib/hash'

const fonts = {
  regular: readFileSync('public/fonts/DejaVuSans.ttf'),
  bold: readFileSync('public/fonts/DejaVuSans-Bold.ttf'),
}
const png = readFileSync('public/pwa-64x64.png')
const image = {
  type: 'image/png',
  data: png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer,
}

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  await db.delete()
})

async function readyAssessment() {
  const org = await ensureOrganization(db, { name: 'Zwieselwiesel', numberPrefix: 'ZW' })
  const a = await createAssessment(db, org.id, '1.0', {
    date: '2026-11-09',
    answers: { ...fillAnswers(def, 'assessment'), 'job.types': { value: ['tree_work'] } },
  })
  const sup = member({ id: 'm1', name: 'Anna Ast', roles: ['supervisor'] })
  await updateAssessment(db, a.id, { team: [sup], supervisorMemberId: 'm1' })
  const t = await addTree(db, a.id)
  await db.trees.update(t.id, { answers: fillAnswers(def, 'tree') })
  return a.id
}

async function signAll(id: string) {
  const a = (await db.assessments.get(id))!
  const trees = await db.trees.where('assessmentId').equals(id).toArray()
  const hash = await assessmentContentHash(a, trees)
  await addSignature(db, id, {
    memberId: 'm1',
    name: 'Anna Ast',
    roles: ['supervisor'],
    statement: 'supervisor',
    method: 'drawn',
    image,
    signedAt: new Date().toISOString(),
    contentHash: hash,
  })
}

describe('finalizeAssessment', () => {
  it('completes, numbers, stores the PDF and its hash, and locks', async () => {
    const id = await readyAssessment()
    await signAll(id)
    const done = await finalizeAssessment(db, id, fonts)
    expect(done.status).toBe('completed')
    expect(done.protocolNumber).toBe('ZW-2026-0001')
    const pdf = (await getProtocolPdf(db, id))!
    expect(new TextDecoder().decode(new Uint8Array(pdf.file.data).slice(0, 5))).toBe('%PDF-')
    // The stored hash belongs to exactly this PDF.
    expect(done.pdfHash).toBe(await sha256Hex(pdf.file.data))
    expect(done.deviceInfo).toBeTruthy()
    await expect(setAnswer(db, id, 'team.briefed', { value: 'no' })).rejects.toBeInstanceOf(
      LockedError,
    )
  })

  it('refuses without signatures', async () => {
    const id = await readyAssessment()
    await expect(finalizeAssessment(db, id, fonts)).rejects.toBeInstanceOf(NotReadyError)
  })

  it('refuses when the content changed after signing', async () => {
    const id = await readyAssessment()
    await signAll(id)
    await setAnswer(db, id, 'site.hospital', { value: 'Uniklinik' })
    await expect(finalizeAssessment(db, id, fonts)).rejects.toThrow(/veraltet/)
  })

  it('refuses with open points', async () => {
    const id = await readyAssessment()
    await setAnswer(db, id, 'team.briefed', undefined)
    await signAll(id)
    await expect(finalizeAssessment(db, id, fonts)).rejects.toThrow(/offen/)
  })
})
