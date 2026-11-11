// @vitest-environment node
/**
 * Sync against the real Supabase project with two simulated devices.
 * Run with: npm run test:cloud (needs the Supabase access token, see docs/PLAN-phase2-cloud.md).
 * Creates two temporary accounts and a test company and removes everything afterwards.
 */
import 'fake-indexeddb/auto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BaumCheckDB } from '../db/db'
import { addTree, createAssessment, ensureOrganization, setTreeAnswer } from '../db/repo'
import { saveCustomer, saveWorker } from '../db/profiles'
import { adoptOrganization, createCloudOrganization, createInvite, requestJoin } from './account'
import { SUPABASE_KEY, SUPABASE_URL } from './config'
import { supabaseRemote } from './supabaseRemote'
import { syncOnce } from './sync'

const REF = 'fjrhcvgiyivanikgazyk'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? 'proxy-injected'
const PW = crypto.randomUUID()
const MAIL = (n: string) => `it-${n}@baumcheck-test.invalid`

async function sql(query: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`SQL ${res.status}: ${await res.text()}`)
  return res.json()
}

async function cleanup() {
  await sql(`
    delete from public.organizations where created_by in
      (select id from auth.users where email like '%@baumcheck-test.invalid');
    delete from public.invites where created_by in
      (select id from auth.users where email like '%@baumcheck-test.invalid');
    delete from auth.users where email like '%@baumcheck-test.invalid';`)
}

const client = () => createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

let owner: SupabaseClient
let member: SupabaseClient
let a: BaumCheckDB
let b: BaumCheckDB
let orgId: string

beforeAll(async () => {
  await cleanup()
  await sql(`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
      'authenticated', e, extensions.crypt('${PW}', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    from unnest(array['${MAIL('owner')}', '${MAIL('member')}']) e`)
  owner = client()
  member = client()
  for (const [c, n] of [
    [owner, 'owner'],
    [member, 'member'],
  ] as const) {
    const { error } = await c.auth.signInWithPassword({ email: MAIL(n), password: PW })
    if (error) throw error
  }
  a = new BaumCheckDB(`cloud-a-${crypto.randomUUID()}`)
  b = new BaumCheckDB(`cloud-b-${crypto.randomUUID()}`)
}, 60_000)

afterAll(async () => {
  // Files of the test company (the owner may delete them), then all rows and accounts.
  if (orgId) {
    for (const folder of ['workers', 'organizations']) {
      const { data } = await owner.storage.from('files').list(`${orgId}/${folder}`, { limit: 100 })
      for (const dir of data ?? []) {
        const { data: files } = await owner.storage
          .from('files')
          .list(`${orgId}/${folder}/${dir.name}`)
        await owner.storage
          .from('files')
          .remove((files ?? []).map((f) => `${orgId}/${folder}/${dir.name}/${f.name}`))
      }
    }
  }
  await cleanup()
  await a?.delete()
  await b?.delete()
}, 60_000)

describe('sync with the real cloud', () => {
  it('owner device → cloud → member device, with rights and files', async () => {
    // Device A: company with data, put into the cloud by the owner.
    const org = await ensureOrganization(a, { name: 'IT-Testfirma', numberPrefix: 'IT' })
    orgId = org.id
    await createCloudOrganization(owner, org, 'Olaf')
    await a.organizations.update(org.id, {
      updatedAt: new Date().toISOString(),
      logo: { type: 'image/png', data: new Uint8Array([137, 80, 78, 71]).buffer },
    })
    const w = await saveWorker(a, org.id, {
      kind: 'employee',
      name: 'Anna Ast',
      qualifications: [{ type: 'skt_a' }],
      signature: { type: 'image/png', data: new Uint8Array([1, 2, 3]).buffer },
      active: true,
    })
    const c = await saveCustomer(a, org.id, { name: 'Kita', sites: [] })
    const draft = await createAssessment(a, org.id, '1.0')
    const tree = await addTree(a, draft.id)
    await setTreeAnswer(a, tree.id, 'tree.height', { value: 18 })

    const ra = await syncOnce(a, org.id, supabaseRemote(owner))
    expect(ra.rejected).toBe(0)
    expect((await a.workers.get(w))?.syncState).toBe('synced')

    // Device B joins and is approved.
    const code = await createInvite(owner, org.id)
    await requestJoin(member, code, 'Mia')
    const { data: req } = await owner.from('memberships').select('user_id').eq('status', 'pending')
    await owner.rpc('decide_membership', {
      p_org: org.id,
      p_user: req![0]!.user_id,
      p_approve: true,
      p_role: 'member',
    })
    await ensureOrganization(b)
    await adoptOrganization(b, org.id, 'IT-Testfirma')
    await syncOnce(b, org.id, supabaseRemote(member))

    const orgB = (await b.organizations.get(org.id))!
    expect([orgB.name, orgB.numberPrefix, orgB.logo?.data.byteLength]).toEqual([
      'IT-Testfirma',
      'IT',
      4,
    ])
    const wB = (await b.workers.get(w))!
    expect([wB.name, new Uint8Array(wB.signature!.data)]).toEqual([
      'Anna Ast',
      new Uint8Array([1, 2, 3]),
    ])
    expect((await b.trees.get(tree.id))?.answers['tree.height']?.value).toBe(18)

    // The member adds and changes; may not change the company or delete.
    const c2 = await saveCustomer(b, org.id, { name: 'Neu von Mia', sites: [] })
    await syncOnce(b, org.id, supabaseRemote(member))
    await b.customers.update(c, { name: 'Kita (von Mia geändert)' }) // created by the owner
    await b.organizations.update(org.id, { name: 'Gekapert' })
    await b.customers.delete(c2) // own record, but only the owner may delete
    const rb = await syncOnce(b, org.id, supabaseRemote(member))
    expect(rb.rejected).toBeGreaterThanOrEqual(2)
    // The refused deletion is undone on B.
    expect((await b.customers.get(c2))?.name).toBe('Neu von Mia')

    await syncOnce(a, org.id, supabaseRemote(owner))
    expect((await a.customers.get(c2))?.name).toBe('Neu von Mia')
    expect((await a.customers.get(c2))?.deletedAt).toBeUndefined()
    // Not allowed for a member: changing the owner's customer and the company.
    expect((await a.customers.get(c))?.name).toBe('Kita')
    expect((await a.organizations.get(org.id))?.name).toBe('IT-Testfirma')
    // B gets the server state back.
    await syncOnce(b, org.id, supabaseRemote(member))
    expect((await b.customers.get(c))?.name).toBe('Kita')
  }, 120_000)
})
