import Dexie from 'dexie'
import type { BaumCheckDB } from '../db/db'
import { getClient } from '../cloud/client'

/**
 * Removes everything this app stored on the device: all data (IndexedDB), the cloud sign-in
 * and preferences. The cloud copy of the company is not touched. Reload afterwards.
 */
export async function wipeDevice(db: BaumCheckDB) {
  try {
    // Only forgets the session on this device (works offline).
    const sb = await getClient()
    await sb.auth.signOut({ scope: 'local' })
  } catch {
    // Not signed in / cloud library not reachable – nothing to do.
  }
  db.close()
  await Dexie.delete(db.name)
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    // Storage blocked (private mode) – nothing stored there either.
  }
}
