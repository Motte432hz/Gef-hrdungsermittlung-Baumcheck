import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { markRemote, type BaumCheckDB } from '../db/db'
import { audit, META_DEVICE_CODE, newId, nowIso } from '../db/repo'
import { linkCompanies } from '../db/profiles'

/**
 * Backup = ZIP with data.json (all tables) and the binary files (photos, signatures, logo,
 * PDFs) as separate entries. Phase 1 keeps data only on the device, so this is the
 * safety net (and the way to move to a new phone).
 */
export const BACKUP_FORMAT = 'baumcheck-backup'
export const BACKUP_VERSION = 1
export const META_LAST_BACKUP = 'lastBackupAt'
const META_CURRENT_ORG = 'currentOrganizationId'

const TABLES = [
  'organizations',
  'workers',
  'companies',
  'equipmentPresets',
  'customers',
  'assessments',
  'trees',
  'signatures',
  'attachments',
  'auditLog',
  'meta',
] as const
type TableName = (typeof TABLES)[number]

/** Device-specific meta entries that are never exported or imported. */
const LOCAL_META_KEYS = new Set([
  META_DEVICE_CODE,
  META_LAST_BACKUP,
  'resetCode',
  'resetAttempts',
  'cloud',
  'cloudJoinName',
])
/** Device-specific: codes, cloud sign-in and sync progress (a new device starts its own). */
const isLocalMeta = (key: string) => LOCAL_META_KEYS.has(key) || key.startsWith('sync:')

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

function extract(value: unknown, files: Record<string, Uint8Array>): unknown {
  if (value instanceof ArrayBuffer) {
    const path = `files/${newId()}.bin`
    files[path] = new Uint8Array(value)
    return { $bin: path }
  }
  if (Array.isArray(value)) return value.map((v) => extract(v, files))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, extract(v, files)]))
  }
  return value
}

function restore(value: unknown, zip: Record<string, Uint8Array>): unknown {
  if (Array.isArray(value)) return value.map((v) => restore(v, zip))
  if (value && typeof value === 'object') {
    const bin = (value as { $bin?: string }).$bin
    if (typeof bin === 'string') {
      const data = zip[bin]
      if (!data) throw new BackupError(`Datei fehlt im Backup: ${bin}`)
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, restore(v, zip)]))
  }
  return value
}

export interface BackupSummary {
  assessments: number
  completed: number
  workers: number
  customers: number
  photos: number
}

export async function exportBackup(
  db: BaumCheckDB,
  appVersion: string,
): Promise<{ zip: Uint8Array; summary: BackupSummary }> {
  const files: Record<string, Uint8Array> = {}
  const tables: Partial<Record<TableName, unknown[]>> = {}
  await db.transaction('r', [...TABLES.map((t) => db[t]), db.tombstones], async (tx) => {
    // Restoring is not a change made on this device: keep the records' own sync marks.
    markRemote(tx)
    for (const t of TABLES) {
      const rows = (await db[t].toArray()) as unknown[]
      tables[t] = (
        t === 'meta' ? rows.filter((m) => !isLocalMeta((m as { key: string }).key)) : rows
      ).map((r) => extract(r, files))
    }
  })
  const assessments = (tables.assessments ?? []) as { status: string }[]
  const summary: BackupSummary = {
    assessments: assessments.length,
    completed: assessments.filter((a) => a.status !== 'draft').length,
    workers: tables.workers?.length ?? 0,
    customers: tables.customers?.length ?? 0,
    photos: ((tables.attachments ?? []) as { kind: string }[]).filter(
      (a) => a.kind === 'tree_photo',
    ).length,
  }
  const manifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: nowIso(),
    appVersion,
    summary,
  }
  const zip = zipSync(
    {
      'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
      'data.json': strToU8(JSON.stringify(tables)),
      ...files,
    },
    { level: 0 }, // photos and PDFs are already compressed
  )
  const orgId = ((await db.meta.get(META_CURRENT_ORG))?.value as string | undefined) ?? ''
  await db.meta.put({ key: META_LAST_BACKUP, value: manifest.createdAt })
  if (orgId) await audit(db, orgId, 'exported', 'backup', undefined, JSON.stringify(summary))
  return { zip, summary }
}

export interface ImportResult {
  added: number
  updated: number
  skipped: number
  summary: BackupSummary
}

type Row = {
  id?: string
  key?: string
  updatedAt?: string
  status?: string
  organizationId?: string
}

/**
 * Merges a backup into the local database. New records are added; existing ones are
 * replaced only if the backup version is newer and the local record is not locked.
 * Completed protocols are never overwritten.
 */
export async function importBackup(db: BaumCheckDB, bytes: Uint8Array): Promise<ImportResult> {
  let zip: Record<string, Uint8Array>
  try {
    zip = unzipSync(bytes)
  } catch {
    throw new BackupError('Die Datei ist kein BaumCheck-Backup.')
  }
  const manifest = zip['manifest.json'] ? JSON.parse(strFromU8(zip['manifest.json'])) : undefined
  if (manifest?.format !== BACKUP_FORMAT)
    throw new BackupError('Die Datei ist kein BaumCheck-Backup.')
  if (manifest.version > BACKUP_VERSION) {
    throw new BackupError(
      'Das Backup stammt aus einer neueren App-Version. Bitte die App aktualisieren.',
    )
  }
  const tables = restore(JSON.parse(strFromU8(zip['data.json']!)), zip) as Partial<
    Record<TableName, Row[]>
  >

  // Phase 1: one organization per device. A backup of another company is only accepted
  // on an unused device (fresh install).
  const backupOrgId = (tables.meta ?? []).find((m) => m.key === META_CURRENT_ORG) as
    { value?: string } | undefined
  const localOrgId = (await db.meta.get(META_CURRENT_ORG))?.value as string | undefined
  let adoptOrg = false
  if (backupOrgId?.value && localOrgId && backupOrgId.value !== localOrgId) {
    const [org, used] = await Promise.all([
      db.organizations.get(localOrgId),
      Promise.all([db.assessments.count(), db.workers.count(), db.customers.count()]),
    ])
    if (org?.name || used.some((n) => n > 0)) {
      throw new BackupError(
        'Das Backup gehört zu einer anderen Firma als die Daten auf diesem Gerät.',
      )
    }
    adoptOrg = true
  }

  let added = 0
  let updated = 0
  let skipped = 0
  await db.transaction('rw', [...TABLES.map((t) => db[t]), db.tombstones], async (tx) => {
    // Restoring is not a change made on this device: keep the records' own sync marks.
    markRemote(tx)
    if (adoptOrg && localOrgId) {
      await db.organizations.delete(localOrgId)
      await db.meta.put({ key: META_CURRENT_ORG, value: backupOrgId!.value })
    }
    for (const t of TABLES) {
      const table = db[t] as unknown as {
        get: (k: string) => Promise<Row | undefined>
        add: (r: Row) => Promise<unknown>
        put: (r: Row) => Promise<unknown>
      }
      for (const row of tables[t] ?? []) {
        if (t === 'meta') {
          const key = row.key!
          if (isLocalMeta(key) || key === META_CURRENT_ORG) continue
          const local = await table.get(key)
          // Number counters: keep the higher one so numbers are never reused.
          if (key.startsWith('counter:')) {
            const v = Math.max(
              Number((local as { value?: number })?.value ?? 0),
              Number((row as { value?: number }).value ?? 0),
            )
            await table.put({ key, value: v } as Row)
          } else if (!local) await table.put(row)
          continue
        }
        const local = await table.get(row.id!)
        if (!local) {
          await table.add(row)
          added++
        } else if (t === 'assessments' && local.status !== 'draft') {
          skipped++
        } else if ((row.updatedAt ?? '') > (local.updatedAt ?? '')) {
          await table.put(row)
          updated++
        } else skipped++
      }
    }
  })
  // Backups from before subcontractor companies existed only have free-text company names.
  await linkCompanies(db)
  const orgId = ((await db.meta.get(META_CURRENT_ORG))?.value as string | undefined) ?? ''
  if (orgId)
    await audit(
      db,
      orgId,
      'imported',
      'backup',
      undefined,
      JSON.stringify({ added, updated, skipped }),
    )
  return { added, updated, skipped, summary: manifest.summary }
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `BaumCheck-Backup_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`
}
