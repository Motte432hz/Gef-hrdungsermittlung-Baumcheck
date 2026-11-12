import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../db/db'
import { createAssessment, ensureOrganization } from '../db/repo'
import { saveOrganization } from '../db/profiles'
import { META_CLOUD } from './syncManager'
import { outboxEntry, processOutbox, queueSend } from './outbox'

let db: BaumCheckDB
beforeEach(() => {
  db = new BaumCheckDB(`test-${crypto.randomUUID()}`)
})
afterEach(async () => {
  await db.delete()
})

async function completedProtocol(synced: boolean) {
  const org = await ensureOrganization(db, { name: 'Zwieselwiesel' })
  await saveOrganization(db, org.id, { reportEmails: ['buero@example.de'] })
  await db.meta.put({
    key: META_CLOUD,
    value: { organizationId: org.id, userId: 'u', role: 'owner' },
  })
  const a = await createAssessment(db, org.id, '1.0')
  await db.assessments.update(a.id, { status: 'completed', protocolNumber: 'ZW-2026-0001' })
  await db.attachments.add({
    id: crypto.randomUUID(),
    organizationId: org.id,
    createdAt: '',
    updatedAt: '',
    syncState: 'pending',
    assessmentId: a.id,
    kind: 'protocol_pdf',
    fileName: 'p.pdf',
    file: { type: 'application/pdf', data: new ArrayBuffer(4) },
    capturedAt: '',
  })
  if (synced) {
    await db.assessments.update(a.id, { syncState: 'synced' })
    await db.attachments.toCollection().modify({ syncState: 'synced' })
  }
  return a.id
}

describe('outbox', () => {
  it('waits until protocol and PDF are on the server, then sends once', async () => {
    const id = await completedProtocol(false)
    expect(await queueSend(db, id)).toBe(true)
    const calls: string[] = []
    const send = async (x: string) => (calls.push(x), { sent: true })
    expect(await processOutbox(db, send)).toBe(0) // not synced yet
    await db.assessments.update(id, { syncState: 'synced' })
    await db.attachments.toCollection().modify({ syncState: 'synced' })
    expect(await processOutbox(db, send)).toBe(1)
    expect(calls).toEqual([id])
    expect((await db.assessments.get(id))?.status).toBe('sent')
    expect(await outboxEntry(db, id)).toBeUndefined()
  })

  it('keeps the entry with the reason when sending fails', async () => {
    const id = await completedProtocol(true)
    await queueSend(db, id)
    await processOutbox(db, async () => ({ error: 'Der Mail-Dienst hat abgelehnt (502).' }))
    expect(await outboxEntry(db, id)).toMatchObject({
      attempts: 1,
      lastError: 'Der Mail-Dienst hat abgelehnt (502).',
    })
    expect((await db.assessments.get(id))?.status).toBe('completed')
  })

  it('is not used without cloud or without report addresses', async () => {
    const id = await completedProtocol(true)
    await saveOrganization(db, (await db.assessments.get(id))!.organizationId, { reportEmails: [] })
    expect(await queueSend(db, id)).toBe(false)
  })
})
