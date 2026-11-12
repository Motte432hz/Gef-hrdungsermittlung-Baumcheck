import type { SupabaseClient } from '@supabase/supabase-js'
import type { BaumCheckDB } from '../db/db'
import { markSent } from '../db/repo'
import { META_CLOUD, type CloudLink } from './syncManager'

/**
 * Outbox for "send the PDF to the office": filled on completion (also offline), worked off
 * after a sync once the protocol and its PDF are on the server.
 */
export const OUTBOX_PREFIX = 'outbox:send:'
export interface OutboxEntry {
  assessmentId: string
  queuedAt: string
  attempts: number
  lastError?: string
}
const key = (id: string) => `${OUTBOX_PREFIX}${id}`

export async function outboxEntry(db: BaumCheckDB, assessmentId: string) {
  return (await db.meta.get(key(assessmentId)))?.value as OutboxEntry | undefined
}

/** Queues sending, if this device works for a cloud company with report addresses. */
export async function queueSend(db: BaumCheckDB, assessmentId: string): Promise<boolean> {
  const link = (await db.meta.get(META_CLOUD))?.value as CloudLink | undefined
  const a = await db.assessments.get(assessmentId)
  const org = a && (await db.organizations.get(a.organizationId))
  if (!link || !a || a.organizationId !== link.organizationId || !org?.reportEmails.length)
    return false
  if (a.status === 'sent') return false
  const entry: OutboxEntry = { assessmentId, queuedAt: new Date().toISOString(), attempts: 0 }
  await db.meta.put({ key: key(assessmentId), value: entry })
  return true
}

/** What the server function needs from the app (Supabase: functions.invoke). */
export type SendCall = (assessmentId: string) => Promise<{ sent?: boolean; error?: string }>

/** Sends what is ready (protocol and PDF synced); keeps the rest for the next run. */
export async function processOutbox(db: BaumCheckDB, send: SendCall): Promise<number> {
  const entries = (await db.meta.where('key').startsWith(OUTBOX_PREFIX).toArray()).map(
    (m) => m.value as OutboxEntry,
  )
  let sent = 0
  for (const entry of entries) {
    const a = await db.assessments.get(entry.assessmentId)
    if (!a || a.status === 'draft') {
      await db.meta.delete(key(entry.assessmentId))
      continue
    }
    const pdf = (await db.attachments.where('assessmentId').equals(a.id).toArray()).find(
      (x) => x.kind === 'protocol_pdf',
    )
    // Not yet on the server – the next sync uploads it.
    if (a.syncState === 'pending' || !pdf || pdf.syncState === 'pending') continue
    let result: { sent?: boolean; error?: string }
    try {
      result = await send(a.id)
    } catch (e) {
      result = { error: (e as Error).message }
    }
    if (result.sent) {
      if (a.status !== 'sent') await markSent(db, a.id)
      await db.meta.delete(key(a.id))
      sent++
    } else {
      await db.meta.put({
        key: key(a.id),
        value: {
          ...entry,
          attempts: entry.attempts + 1,
          lastError: result.error ?? 'Unbekannter Fehler',
        },
      })
    }
  }
  return sent
}

/** Calls the server function that e-mails the PDF (Supabase Edge Function "send-protocol"). */
export function sendViaServer(sb: SupabaseClient): SendCall {
  return async (assessmentId) => {
    const { data, error } = await sb.functions.invoke('send-protocol', { body: { assessmentId } })
    if (!error) return data as { sent?: boolean }
    // The function answers with a German message in {"error": "..."}.
    const res = (error as { context?: Response }).context
    const body = res ? await res.json().catch(() => undefined) : undefined
    return { error: (body as { error?: string } | undefined)?.error ?? error.message }
  }
}
