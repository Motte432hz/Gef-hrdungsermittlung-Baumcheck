import { RemoteError, type CloudRow, type Remote } from './sync'

/**
 * In-memory stand-in for the cloud with the same rules as the real server: older versions
 * never overwrite newer ones, `synced_at` comes from the server clock, files are stored by
 * path. `deny` simulates the access rules. Used by tests.
 */
export class FakeRemote implements Remote {
  tables = new Map<string, Map<string, CloudRow>>()
  files = new Map<string, ArrayBuffer>()
  uploads = 0
  downloads = 0
  private clock = 0
  deny: (table: string, row: CloudRow) => boolean = () => false

  private t(name: string) {
    let m = this.tables.get(name)
    if (!m) this.tables.set(name, (m = new Map()))
    return m
  }
  private tick() {
    this.clock++
    return new Date(Date.UTC(2030, 0, 1) + this.clock).toISOString()
  }
  rows(table: string) {
    return [...this.t(table).values()]
  }
  get(table: string, id: string) {
    return this.t(table).get(id)
  }
  /** Simulates a change made by another device. */
  put(table: string, row: Omit<CloudRow, 'synced_at'>) {
    this.t(table).set(row.id, { ...structuredClone(row), synced_at: this.tick() })
  }

  async upsert(table: string, rows: CloudRow[], opts?: { ignoreDuplicates?: boolean }) {
    for (const row of rows)
      if (this.deny(table, row)) throw new RemoteError('Keine Berechtigung.', true)
    for (const row of rows) {
      const old = this.t(table).get(row.id)
      if (old && (opts?.ignoreDuplicates || row.updated_at < old.updated_at)) continue
      this.put(table, row)
    }
  }
  async update(table: string, row: CloudRow) {
    if (this.deny(table, row)) throw new RemoteError('Keine Berechtigung.', true)
    const old = this.t(table).get(row.id)
    if (old && row.updated_at >= old.updated_at) this.put(table, row)
  }
  async softDelete(table: string, id: string, at: string) {
    const old = this.t(table).get(id)
    if (!old) return
    if (this.deny(table, old)) throw new RemoteError('Keine Berechtigung.', true)
    this.put(table, {
      ...old,
      deleted_at: at,
      updated_at: at > old.updated_at ? at : old.updated_at,
    })
  }
  async fetchSince(table: string, orgId: string, cursor: string, limit: number) {
    return this.rows(table)
      .filter((r) => r.organization_id === orgId && r.synced_at! > cursor)
      .sort((a, b) => a.synced_at!.localeCompare(b.synced_at!))
      .slice(0, limit)
      .map((r) => structuredClone(r))
  }
  async fetchOne(table: string, id: string) {
    const r = this.t(table).get(id)
    return r ? structuredClone(r) : null
  }
  async uploadFile(path: string, data: ArrayBuffer) {
    this.uploads++
    if (!this.files.has(path)) this.files.set(path, data.slice(0))
  }
  async downloadFile(path: string) {
    this.downloads++
    const f = this.files.get(path)
    if (!f) throw new RemoteError(`Datei fehlt: ${path}`)
    return f.slice(0)
  }
}
