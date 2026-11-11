import type { SupabaseClient } from '@supabase/supabase-js'
import type { BaumCheckDB } from '../db/db'
import { META_CURRENT_ORG } from '../db/repo'
import type { ID, Organization } from '../domain/types'

export type MembershipRole = 'owner' | 'admin' | 'member'
export type MembershipStatus = 'pending' | 'active' | 'rejected' | 'removed'

export interface Membership {
  organizationId: ID
  organizationName?: string
  role: MembershipRole
  status: MembershipStatus
  displayName: string
}

export const ROLE_LABELS_CLOUD: Record<MembershipRole, string> = {
  owner: 'Inhaber/in',
  admin: 'Admin',
  member: 'Mitarbeiter/in',
}

/** Turns technical errors into short German messages for the screen. */
export function cloudErrorMessage(err: unknown): string {
  const msg = (err as { message?: string } | null)?.message ?? String(err)
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(msg))
    return 'Keine Verbindung zum Server. Bitte Internet prüfen.'
  if (/Token has expired|invalid.*otp|otp.*invalid|Token.*invalid/i.test(msg))
    return 'Der Code ist falsch oder abgelaufen.'
  if (/rate limit|too many|security purposes/i.test(msg))
    return 'Zu viele Versuche. Bitte in ein paar Minuten erneut probieren.'
  // Messages written by our database functions are already German.
  return msg
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export async function sendLoginCode(sb: SupabaseClient, email: string) {
  const { error } = await sb.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true },
  })
  if (error) throw error
}

export async function verifyLoginCode(sb: SupabaseClient, email: string, code: string) {
  const { error } = await sb.auth.verifyOtp({
    email: normalizeEmail(email),
    token: code.replace(/\D/g, ''),
    type: 'email',
  })
  if (error) throw error
}

/** The signed-in user's memberships with company names (where readable). */
export async function loadMemberships(sb: SupabaseClient, userId: string): Promise<Membership[]> {
  const { data, error } = await sb
    .from('memberships')
    .select('organization_id, role, status, display_name')
    .eq('user_id', userId)
  if (error) throw error
  const rows = (data ?? []) as {
    organization_id: string
    role: MembershipRole
    status: MembershipStatus
    display_name: string
  }[]
  const active = rows.filter((r) => r.status === 'active').map((r) => r.organization_id)
  const names = new Map<string, string>()
  if (active.length) {
    const { data: orgs, error: e2 } = await sb
      .from('organizations')
      .select('id, data')
      .in('id', active)
    if (e2) throw e2
    for (const o of (orgs ?? []) as { id: string; data: { name?: string } }[])
      names.set(o.id, o.data?.name ?? '')
  }
  return rows.map((r) => ({
    organizationId: r.organization_id,
    organizationName: names.get(r.organization_id),
    role: r.role,
    status: r.status,
    displayName: r.display_name,
  }))
}

/** Company data shown before the first full sync (the rest follows with the sync). */
export const orgSummary = (org: Organization) => ({
  name: org.name,
  numberPrefix: org.numberPrefix,
})

/** Puts this device's company into the cloud; the signed-in user becomes owner. */
export async function createCloudOrganization(
  sb: SupabaseClient,
  org: Organization,
  displayName: string,
) {
  const { error } = await sb.rpc('create_organization', {
    p_id: org.id,
    p_data: orgSummary(org),
    p_display_name: displayName.trim(),
  })
  if (error) throw error
}

export async function requestJoin(
  sb: SupabaseClient,
  code: string,
  displayName: string,
): Promise<{ organizationId: string; organizationName: string; status: MembershipStatus }> {
  const { data, error } = await sb.rpc('request_join', {
    p_code: code,
    p_display_name: displayName.trim(),
    p_device_info: navigator.userAgent.slice(0, 200),
  })
  if (error) throw error
  const row = (
    data as { organization_id: string; organization_name: string; status: MembershipStatus }[]
  )[0]
  if (!row) throw new Error('Der Code ist ungültig oder abgelaufen.')
  return {
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    status: row.status,
  }
}

export async function createInvite(sb: SupabaseClient, organizationId: string): Promise<string> {
  const { data, error } = await sb.rpc('create_invite', { p_org: organizationId })
  if (error) throw error
  return data as string
}

/**
 * After approval, this device works for the cloud company: drafts, people and customers
 * created here before are moved over. Completed protocols of another company cannot be
 * moved (they are locked) – then joining is refused with a clear message.
 */
export async function adoptOrganization(db: BaumCheckDB, toId: ID, name?: string) {
  await db.transaction(
    'rw',
    [
      db.meta,
      db.organizations,
      db.workers,
      db.companies,
      db.customers,
      db.equipmentPresets,
      db.assessments,
      db.trees,
      db.signatures,
      db.attachments,
      db.auditLog,
    ],
    async () => {
      const fromId = (await db.meta.get(META_CURRENT_ORG))?.value as string | undefined
      if (fromId === toId) return
      if (fromId) {
        const locked = await db.assessments
          .where('organizationId')
          .equals(fromId)
          .filter((a) => a.status !== 'draft')
          .count()
        if (locked > 0)
          throw new Error(
            'Auf diesem Gerät gibt es abgeschlossene Protokolle einer anderen Firma. Bitte zuerst ein Backup erstellen und die App zurücksetzen.',
          )
        for (const table of [
          db.workers,
          db.companies,
          db.customers,
          db.equipmentPresets,
          db.assessments,
          db.trees,
          db.signatures,
          db.attachments,
          db.auditLog,
        ] as const) {
          await (table as typeof db.workers)
            .where('organizationId')
            .equals(fromId)
            .modify({ organizationId: toId, syncState: 'pending' })
        }
      }
      if (!(await db.organizations.get(toId))) {
        // Placeholder until the first sync brings the company's data. The old date makes
        // sure the cloud version always wins.
        const old = '1970-01-01T00:00:00.000Z'
        await db.organizations.add({
          id: toId,
          organizationId: toId,
          name: name ?? '',
          numberPrefix: 'BC',
          reportEmails: [],
          createdAt: old,
          updatedAt: old,
          syncState: 'synced',
        })
      }
      if (fromId) await db.organizations.delete(fromId)
      await db.meta.put({ key: META_CURRENT_ORG, value: toId })
    },
  )
}
