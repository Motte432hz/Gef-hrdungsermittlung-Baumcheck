import type { Table } from 'dexie'
import { markRemote, type BaumCheckDB, type SyncedTable } from '../db/db'
import type { StoredFile } from '../domain/types'
import { canonicalJson, sha256Hex } from '../lib/hash'

/**
 * Sync between this device (IndexedDB, the working copy) and the company's cloud copy.
 *
 * Push: records marked "pending" are uploaded (files first, to the storage bucket); a record
 * is only marked "synced" if it did not change in the meantime. Local deletions are sent as
 * soft deletes. Pull: rows changed on the server since the last pull (server clock
 * `synced_at`) are applied, unless this device has a newer unsent version.
 */

/** One cloud row, as stored by the server. */
export interface CloudRow {
  id: string
  organization_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  synced_at?: string
  data: Record<string, unknown>
  status?: string
  assessment_id?: string
}

export class RemoteError extends Error {
  constructor(
    message: string,
    /** True for "not allowed" (access rules); retrying will not help. */
    readonly denied = false,
  ) {
    super(message)
    this.name = 'RemoteError'
  }
}

/** What the sync needs from the server – implemented for Supabase and as a fake in tests. */
export interface Remote {
  upsert(table: string, rows: CloudRow[], opts?: { ignoreDuplicates?: boolean }): Promise<void>
  update(table: string, row: CloudRow): Promise<void>
  softDelete(table: string, id: string, at: string): Promise<void>
  fetchSince(table: string, orgId: string, cursor: string, limit: number): Promise<CloudRow[]>
  fetchOne(table: string, id: string): Promise<CloudRow | null>
  uploadFile(path: string, data: ArrayBuffer, type: string): Promise<void>
  downloadFile(path: string): Promise<ArrayBuffer>
}

interface Spec {
  local: SyncedTable
  remote: string
  files?: string[]
  /** Parts of a protocol (stored with assessment_id). */
  part?: boolean
  /** Deletions from the cloud remove the local record (instead of a soft delete). */
  hardDelete?: boolean
  appendOnly?: boolean
}

const SPECS: Spec[] = [
  { local: 'organizations', remote: 'organizations', files: ['logo'] },
  { local: 'companies', remote: 'companies' },
  { local: 'workers', remote: 'workers', files: ['signature'] },
  { local: 'customers', remote: 'customers' },
  { local: 'equipmentPresets', remote: 'equipment_presets' },
  { local: 'assessments', remote: 'assessments', hardDelete: true },
  { local: 'trees', remote: 'trees', part: true, hardDelete: true },
  { local: 'signatures', remote: 'signatures', files: ['image'], part: true, hardDelete: true },
  { local: 'attachments', remote: 'attachments', files: ['file'], part: true, hardDelete: true },
  { local: 'auditLog', remote: 'audit_log', appendOnly: true },
]
const spec = (local: SyncedTable) => SPECS.find((s) => s.local === local)!

/**
 * Trees and signatures go up before their protocol: once the server has the protocol as
 * completed, no parts can be added any more. Attachments (PDF) may follow later.
 */
const PUSH_ORDER: SyncedTable[] = [
  'organizations',
  'companies',
  'workers',
  'customers',
  'equipmentPresets',
  'trees',
  'signatures',
  'assessments',
  'attachments',
  'auditLog',
]
const PULL_ORDER: SyncedTable[] = SPECS.map((s) => s.local)

const CHUNK = 50
const PAGE = 200
const EPOCH = '1970-01-01T00:00:00.000Z'
export const cursorKey = (remote: string) => `sync:cursor:${remote}`

type LocalRecord = Record<string, unknown> & {
  id: string
  organizationId: string
  syncState?: string
  updatedAt?: string
  createdAt?: string
  deletedAt?: string
  at?: string
}

interface FileRef {
  $file: string
  type: string
}
const isFileRef = (v: unknown): v is FileRef =>
  !!v && typeof v === 'object' && typeof (v as FileRef).$file === 'string'
// No instanceof: buffers from IndexedDB may come from another realm.
const isStoredFile = (v: unknown): v is StoredFile =>
  !!v &&
  typeof v === 'object' &&
  Object.prototype.toString.call((v as StoredFile).data) === '[object ArrayBuffer]'

const filePath = (orgId: string, s: Spec, id: string, field: string, hash: string) =>
  `${orgId}/${s.remote}/${id}/${field}-${hash}`

/** Local record → cloud row (files are uploaded, the row only references them). */
export async function toRow(s: Spec, rec: LocalRecord, remote: Remote): Promise<CloudRow> {
  const data: Record<string, unknown> = { ...rec }
  delete data.syncState
  for (const field of s.files ?? []) {
    const f = data[field]
    if (!isStoredFile(f)) continue
    const path = filePath(rec.organizationId, s, rec.id, field, await sha256Hex(f.data))
    await remote.uploadFile(path, f.data, f.type)
    data[field] = { $file: path, type: f.type } satisfies FileRef
  }
  const row: CloudRow = {
    id: rec.id,
    organization_id: rec.organizationId,
    created_at: rec.createdAt ?? rec.at ?? EPOCH,
    updated_at: rec.updatedAt ?? rec.at ?? EPOCH,
    deleted_at: rec.deletedAt ?? null,
    data,
  }
  if (s.local === 'assessments') row.status = String(rec.status ?? 'draft')
  if (s.part) row.assessment_id = String(rec.assessmentId)
  return row
}

/** Cloud row → local record (files are downloaded unless this device has them already). */
export async function fromRow(
  s: Spec,
  row: CloudRow,
  local: LocalRecord | undefined,
  remote: Remote,
): Promise<LocalRecord> {
  const rec: LocalRecord = {
    ...(row.data as LocalRecord),
    id: row.id,
    organizationId: row.organization_id,
    syncState: 'synced',
  }
  if (row.deleted_at) rec.deletedAt = row.deleted_at
  else delete rec.deletedAt
  rec.createdAt ??= row.created_at
  if (s.local !== 'auditLog') rec.updatedAt ??= row.updated_at
  // A company created in the cloud only has a summary until its first device sends the rest.
  if (s.local === 'organizations') {
    rec.name ??= ''
    rec.numberPrefix ??= 'BC'
    rec.reportEmails ??= []
  }
  for (const field of s.files ?? []) {
    const ref = rec[field]
    if (!isFileRef(ref)) continue
    const mine = local?.[field]
    if (isStoredFile(mine) && ref.$file.endsWith(`-${await sha256Hex(mine.data)}`)) {
      rec[field] = mine
    } else {
      rec[field] = {
        type: ref.type,
        data: await remote.downloadFile(ref.$file),
      } satisfies StoredFile
    }
  }
  return rec
}

export interface SyncResult {
  pushed: number
  pulled: number
  deleted: number
  /** Changes the server did not accept (e.g. missing rights); the server version was kept. */
  rejected: number
}

const table = (db: BaumCheckDB, name: SyncedTable) =>
  db.table(name) as unknown as Table<LocalRecord, string>

const same = (a: LocalRecord | undefined, b: LocalRecord) => {
  if (!a) return false
  const strip = (r: LocalRecord) => ({ ...r, syncState: undefined })
  return a.updatedAt === b.updatedAt && canonicalJson(strip(a)) === canonicalJson(strip(b))
}

/** Applies cloud rows locally (in one transaction marked as remote). */
async function applyRows(
  db: BaumCheckDB,
  s: Spec,
  rows: CloudRow[],
  remote: Remote,
  /** Apply even over a newer local change (the server refused that change). */
  force = false,
): Promise<{ applied: number; deleted: number }> {
  const t = table(db, s.local)
  // Files are fetched before the transaction (IndexedDB transactions end on network waits).
  const prepared: { row: CloudRow; rec?: LocalRecord }[] = []
  for (const row of rows) {
    const local = await t.get(row.id)
    const localNewer =
      local?.syncState === 'pending' && (local.updatedAt ?? local.at ?? '') >= row.updated_at
    if (localNewer && !force) continue
    if (row.deleted_at && s.hardDelete) prepared.push({ row })
    else prepared.push({ row, rec: await fromRow(s, row, local, remote) })
  }
  let applied = 0
  let deleted = 0
  await db.transaction('rw', t, async (tx) => {
    markRemote(tx)
    for (const { row, rec } of prepared) {
      if (rec) {
        await t.put(rec)
        applied++
      } else if (await t.get(row.id)) {
        await t.delete(row.id)
        deleted++
      }
    }
  })
  return { applied, deleted }
}

async function push(db: BaumCheckDB, orgId: string, remote: Remote, result: SyncResult) {
  for (const name of PUSH_ORDER) {
    const s = spec(name)
    const t = table(db, name)
    const pending = (await t.where('syncState').equals('pending').toArray()).filter((r) =>
      name === 'organizations' ? r.id === orgId : r.organizationId === orgId,
    )
    for (let i = 0; i < pending.length; i += CHUNK) {
      const recs = pending.slice(i, i + CHUNK)
      const rows = await Promise.all(recs.map((r) => toRow(s, r, remote)))
      const done: LocalRecord[] = []
      const send = (rs: CloudRow[]) =>
        name === 'organizations'
          ? Promise.all(rs.map((r) => remote.update(s.remote, r))).then(() => {})
          : remote.upsert(s.remote, rs, { ignoreDuplicates: s.appendOnly })
      try {
        await send(rows)
        done.push(...recs)
      } catch (err) {
        if (!(err instanceof RemoteError)) throw err
        // Find the records the server does not accept; send the others one by one.
        for (let k = 0; k < rows.length; k++) {
          try {
            await send([rows[k]!])
            done.push(recs[k]!)
          } catch (e) {
            if (!(e instanceof RemoteError) || !e.denied) throw e
            // Not allowed: keep the server version (or drop the local-only change).
            result.rejected++
            const server = await remote.fetchOne(s.remote, rows[k]!.id)
            if (server) await applyRows(db, s, [server], remote, true)
            else
              await db.transaction('rw', t, async (tx) => {
                markRemote(tx)
                await t.update(rows[k]!.id, { syncState: 'synced' })
              })
          }
        }
      }
      // Mark as synced only what did not change while it was being sent.
      await db.transaction('rw', t, async () => {
        for (const sent of done) {
          if (same(await t.get(sent.id), sent)) await t.update(sent.id, { syncState: 'synced' })
        }
      })
      result.pushed += done.length
    }
  }

  // Deletions made on this device.
  const tombs = await db.tombstones.where('organizationId').equals(orgId).toArray()
  for (const tomb of tombs) {
    const s = spec(tomb.table)
    try {
      if (!s.appendOnly) await remote.softDelete(s.remote, tomb.id, tomb.at)
    } catch (e) {
      if (!(e instanceof RemoteError) || !e.denied) throw e
      // Deleting is not allowed: bring the record back on this device.
      result.rejected++
      const server = await remote.fetchOne(s.remote, tomb.id)
      if (server) await applyRows(db, s, [server], remote, true)
    }
    await db.tombstones.delete(tomb.seq!)
  }
}

async function pull(db: BaumCheckDB, orgId: string, remote: Remote, result: SyncResult) {
  for (const name of PULL_ORDER) {
    const s = spec(name)
    const key = cursorKey(s.remote)
    let cursor = ((await db.meta.get(key))?.value as string | undefined) ?? EPOCH
    for (;;) {
      const rows = await remote.fetchSince(s.remote, orgId, cursor, PAGE)
      if (rows.length === 0) break
      const { applied, deleted } = await applyRows(db, s, rows, remote)
      result.pulled += applied
      result.deleted += deleted
      cursor = rows[rows.length - 1]!.synced_at ?? cursor
      await db.meta.put({ key, value: cursor })
      if (rows.length < PAGE) break
    }
  }
}

/** One full sync run for the given company: first send, then fetch. */
export async function syncOnce(
  db: BaumCheckDB,
  orgId: string,
  remote: Remote,
): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, deleted: 0, rejected: 0 }
  await push(db, orgId, remote, result)
  await pull(db, orgId, remote, result)
  return result
}
