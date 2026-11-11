import Dexie from 'dexie'
import { useSyncExternalStore } from 'react'
import { SYNCED_TABLES, type BaumCheckDB } from '../db/db'
import { META_CURRENT_ORG } from '../db/repo'
import { cloudErrorMessage } from './account'
import { getClient } from './client'
import { supabaseRemote } from './supabaseRemote'
import { syncOnce } from './sync'

/** Saved when this device works for a company in the cloud (cleared on sign-out). */
export const META_CLOUD = 'cloud'
export interface CloudLink {
  organizationId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  /** The user's own person profile in the company. */
  workerId?: string
}
export const META_LAST_SYNC = 'sync:lastAt'

export interface SyncStatus {
  state: 'off' | 'idle' | 'syncing' | 'offline' | 'error'
  lastSyncAt?: string
  pending: number
  error?: string
}

let status: SyncStatus = { state: 'off', pending: 0 }
const listeners = new Set<() => void>()
function set(next: Partial<SyncStatus>) {
  status = { ...status, ...next }
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => status,
    () => status,
  )
}

async function countPending(db: BaumCheckDB, orgId: string) {
  let n = await db.tombstones.where('organizationId').equals(orgId).count()
  for (const t of SYNCED_TABLES) {
    n += await db
      .table(t)
      .where('syncState')
      .equals('pending')
      .filter((r: { organizationId?: string }) => r.organizationId === orgId)
      .count()
  }
  return n
}

let running: Promise<void> | undefined
let again = false

/** Runs one sync now (or right after the current one). Safe to call any time. */
export function syncNow(db: BaumCheckDB): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    try {
      do {
        again = false
        await runOnce(db)
      } while (again)
    } finally {
      running = undefined
    }
  })()
  return running
}

async function runOnce(db: BaumCheckDB) {
  const link = (await db.meta.get(META_CLOUD))?.value as CloudLink | undefined
  const orgId = (await db.meta.get(META_CURRENT_ORG))?.value as string | undefined
  if (!link || link.organizationId !== orgId) return set({ state: 'off', pending: 0 })
  const lastSyncAt = (await db.meta.get(META_LAST_SYNC))?.value as string | undefined
  if (!navigator.onLine) {
    return set({ state: 'offline', lastSyncAt, pending: await countPending(db, orgId) })
  }
  const sb = await getClient()
  const { data } = await sb.auth.getSession()
  if (!data.session) return set({ state: 'off', pending: 0 })
  set({ state: 'syncing', lastSyncAt, error: undefined })
  try {
    await syncOnce(db, orgId, supabaseRemote(sb))
    const at = new Date().toISOString()
    await db.meta.put({ key: META_LAST_SYNC, value: at })
    set({ state: 'idle', lastSyncAt: at, pending: await countPending(db, orgId) })
  } catch (e) {
    console.error(e)
    set({
      state: 'error',
      error: cloudErrorMessage(e),
      pending: await countPending(db, orgId),
    })
  }
}

let started = false

/**
 * Starts automatic syncing: at start, when the network returns, when the app comes back to
 * the foreground, shortly after local changes and every minute.
 */
export function startAutoSync(db: BaumCheckDB) {
  if (started) return
  started = true
  const kick = () => void syncNow(db)
  let timer: number | undefined
  const soon = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(kick, 3000)
  }
  window.addEventListener('online', kick)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kick()
  })
  window.setInterval(kick, 60_000)
  // Local changes (any table): sync a few seconds later. Changes written by the sync itself
  // only trigger a cheap check (nothing pending → nothing sent).
  Dexie.on('storagemutated', () => {
    if (status.state !== 'off' && !running) soon()
  })
  kick()
}
