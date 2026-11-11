import type { SupabaseClient } from '@supabase/supabase-js'
import { RemoteError, type CloudRow, type Remote } from './sync'

const BUCKET = 'files'

/** "Not allowed" from the database rules or storage policies – retrying does not help. */
function isDenied(e: { code?: string; message?: string; statusCode?: string | number }) {
  return (
    e.code === '42501' ||
    String(e.statusCode) === '403' ||
    /row-level security|permission denied|Nur die Inhaberin|abgeschlossen/i.test(e.message ?? '')
  )
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return
  // Network failures surface as TypeError from fetch (not RemoteError): the run stops and
  // is retried later.
  throw new RemoteError(error.message, isDenied(error))
}

/** The sync's view of the Supabase project. */
export function supabaseRemote(sb: SupabaseClient): Remote {
  return {
    async upsert(table, rows, opts) {
      const { error } = await sb
        .from(table)
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: !!opts?.ignoreDuplicates })
      check(error)
    },
    async update(table, row) {
      const { error } = await sb
        .from(table)
        .update({ data: row.data, updated_at: row.updated_at, deleted_at: row.deleted_at })
        .eq('id', row.id)
      check(error)
    },
    async softDelete(table, id, at) {
      const { error } = await sb.from(table).update({ deleted_at: at, updated_at: at }).eq('id', id)
      check(error)
    },
    async fetchSince(table, orgId, cursor, limit) {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .eq('organization_id', orgId)
        .gt('synced_at', cursor)
        .order('synced_at', { ascending: true })
        .limit(limit)
      check(error)
      return (data ?? []) as CloudRow[]
    },
    async fetchOne(table, id) {
      const { data, error } = await sb.from(table).select('*').eq('id', id).maybeSingle()
      check(error)
      return (data as CloudRow | null) ?? null
    },
    async uploadFile(path, data, type) {
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(path, data, { contentType: type, upsert: false })
      // Same path = same content (the path contains its hash): already there is fine.
      if (error && !/exists|duplicate/i.test(error.message)) {
        throw new RemoteError(
          error.message,
          isDenied(error as { message: string; statusCode?: string }),
        )
      }
    },
    async downloadFile(path) {
      const { data, error } = await sb.storage.from(BUCKET).download(path)
      if (error || !data) throw new RemoteError(error?.message ?? `Datei fehlt: ${path}`)
      return data.arrayBuffer()
    },
  }
}
