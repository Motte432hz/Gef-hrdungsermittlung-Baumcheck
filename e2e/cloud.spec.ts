import { expect, test, type Page } from '@playwright/test'
import { fillCompleteAssessment, signEveryone } from './helpers'

// The cloud server is simulated: no real e-mails, no real accounts.
// Service workers would bypass page.route in WebKit, so they are blocked here.
test.use({ serviceWorkers: 'block' })

const SB = 'https://fjrhcvgiyivanikgazyk.supabase.co'
const USER = { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'anna@example.de' }
const CLOUD_ORG = 'cccccccc-0000-0000-0000-000000000001'

interface FakeMembership {
  organization_id: string
  user_id?: string
  role: string
  status: string
  display_name: string
  email?: string
  worker_id?: string | null
  requested_at?: string
}

interface Server {
  memberships: FakeMembership[]
  orgName: Record<string, string>
  calls: string[]
}

async function fakeServer(page: Page): Promise<Server> {
  const s: Server = { memberships: [], orgName: {}, calls: [] }
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
  await page.route(`${SB}/**`, async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    s.calls.push(`${route.request().method()} ${path}`)
    let body: Record<string, unknown> | undefined
    try {
      body = route.request().postDataJSON() as Record<string, unknown> | undefined
    } catch {
      body = undefined // files (storage uploads) are not JSON
    }
    if (path === '/auth/v1/otp') return route.fulfill(json({}))
    if (path === '/auth/v1/verify') {
      if (body?.token !== '123456')
        return route.fulfill(
          json(
            { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' },
            403,
          ),
        )
      return route.fulfill(
        json({
          access_token: 'a.b.c',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'r',
          user: { ...USER, aud: 'authenticated', role: 'authenticated' },
        }),
      )
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204 })
    if (path === '/rest/v1/memberships') {
      if (route.request().method() === 'HEAD') {
        const n = s.memberships.filter((m) => m.status === 'pending').length
        // Like the real server: the count header is exposed to the app.
        return route.fulfill({
          status: 200,
          headers: {
            'content-range': `0-0/${n}`,
            'access-control-allow-origin': '*',
            'access-control-expose-headers': 'Content-Range',
          },
        })
      }
      return route.fulfill(
        json(
          s.memberships.map((m) => ({
            user_id: USER.id,
            requested_at: '2026-11-11T08:00:00Z',
            worker_id: null,
            ...m,
          })),
        ),
      )
    }
    if (path === '/rest/v1/rpc/register_device') return route.fulfill(json('M1'))
    if (path === '/rest/v1/rpc/set_my_worker') return route.fulfill({ status: 204 })
    if (path === '/rest/v1/rpc/decide_membership') {
      const m = s.memberships.find((x) => x.user_id === body!.p_user)!
      m.status = body!.p_approve ? 'active' : 'rejected'
      m.role = body!.p_role as string
      return route.fulfill({ status: 204 })
    }
    if (
      path === '/rest/v1/organizations' &&
      route.request().method() === 'GET' &&
      url.searchParams.has('id')
    )
      return route.fulfill(
        json(Object.entries(s.orgName).map(([id, name]) => ({ id, data: { name } }))),
      )
    if (path === '/rest/v1/rpc/create_organization') {
      const id = body!.p_id as string
      s.orgName[id] = (body!.p_data as { name: string }).name
      s.memberships = [
        {
          organization_id: id,
          user_id: USER.id,
          role: 'owner',
          status: 'active',
          display_name: body!.p_display_name as string,
          email: USER.email,
        },
      ]
      return route.fulfill({ status: 204 })
    }
    if (path === '/rest/v1/rpc/create_invite') return route.fulfill(json('K7P3-9QXM'))
    if (path === '/rest/v1/rpc/request_join') {
      if (String(body!.p_code).replace(/\W/g, '') !== 'K7P39QXM')
        return route.fulfill(
          json({ code: 'P0002', message: 'Der Code ist ungültig oder abgelaufen.' }, 404),
        )
      s.memberships = [
        {
          organization_id: CLOUD_ORG,
          role: 'member',
          status: 'pending',
          display_name: body!.p_display_name as string,
        },
      ]
      return route.fulfill(
        json([
          { organization_id: CLOUD_ORG, organization_name: 'Zwieselwiesel', status: 'pending' },
        ]),
      )
    }
    if (path === '/functions/v1/send-protocol') {
      s.calls.push(`send ${body!.assessmentId}`)
      return route.fulfill(
        json({ sent: true, to: ['buero@example.de'], sentAt: new Date().toISOString() }),
      )
    }
    // Sync: reading returns nothing new, writing is accepted.
    if (path.startsWith('/rest/v1/')) {
      const method = route.request().method()
      if (method === 'GET') return route.fulfill(json([]))
      s.calls.push(`sync ${method} ${path}`)
      return route.fulfill({ status: method === 'POST' ? 201 : 204 })
    }
    if (path.startsWith('/storage/v1/object/files/'))
      return route.fulfill(json({ Key: path.replace('/storage/v1/object/', '') }))
    return route.fulfill(json({ message: `unexpected ${path}` }, 500))
  })
  return s
}

async function signIn(page: Page) {
  await page.getByLabel('E-Mail-Adresse', { exact: true }).fill('Anna@Example.de ')
  await page.getByRole('button', { name: 'Code senden' }).click()
  await expect(page.getByText('Code an Anna@Example.de gesendet.')).toBeVisible()
  await page.getByLabel('Code aus der E-Mail').fill('000000')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page.getByText('Der Code ist falsch oder abgelaufen.')).toBeVisible()
  await page.getByLabel('Code aus der E-Mail').fill('123 456')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page.getByText('Angemeldet als anna@example.de')).toBeVisible()
}

test('owner puts the company into the cloud and invites someone', async ({ page }) => {
  const server = await fakeServer(page)
  await page.goto('/profile/firma')
  await page.getByLabel('Firmenname').fill('Zwieselwiesel')
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()
  await page.getByRole('link', { name: /Firmen-Kartei/ }).click()

  await signIn(page)
  await page.getByRole('button', { name: 'Unsere Firma in die Cloud bringen' }).click()
  await page.getByLabel('Dein Name').fill('Anna Ast')
  await page.getByRole('button', { name: 'Firmen-Kartei anlegen' }).click()
  await expect(page.getByText('Zwieselwiesel · Inhaber/in')).toBeVisible()
  expect(server.calls).toContain('POST /rest/v1/rpc/create_organization')
  // The company's data goes up right away.
  await expect(page.getByTestId('sync-status')).toContainText('✓ Abgeglichen')
  expect(server.calls).toContain('sync PATCH /rest/v1/organizations')

  await page.getByRole('button', { name: 'Einladungs-Code erstellen' }).click()
  await expect(page.getByTestId('invite-code')).toHaveText('K7P3-9QXM')
  await expect(page.getByRole('listitem', { name: 'Mitglied Anna Ast' })).toContainText('(du)')

  // Someone asks to join; the owner sees it on the company page and approves.
  server.memberships.push({
    organization_id: server.memberships[0]!.organization_id,
    user_id: 'bbbbbbbb-0000-0000-0000-000000000002',
    role: 'member',
    status: 'pending',
    display_name: 'Mia',
    email: 'mia@example.de',
  })
  await page.getByRole('link', { name: 'Firma', exact: true }).click()
  await expect(page.getByText('1 Beitrittsanfrage wartet')).toBeVisible()
  await page.getByRole('link', { name: /Firmen-Kartei/ }).click()
  const request = page.getByRole('listitem', { name: 'Anfrage von Mia' })
  await expect(request).toContainText('mia@example.de')
  await request.getByRole('button', { name: 'Freigeben', exact: true }).click()
  await expect(page.getByRole('listitem', { name: 'Mitglied Mia' })).toContainText('Mitarbeiter/in')
  expect(server.calls).toContain('POST /rest/v1/rpc/decide_membership')
})

test('new device joins with a code and switches to the company after approval', async ({
  page,
}) => {
  const server = await fakeServer(page)
  await page.goto('/profile/firma/cloud')
  await signIn(page)
  await page.getByRole('button', { name: 'Einer Firma beitreten (mit Code)' }).click()
  await page.getByLabel('Einladungs-Code').fill('abcd-efgh')
  await page.getByLabel('Dein Name').fill('Mia')
  await page.getByRole('button', { name: 'Anfrage senden' }).click()
  await expect(page.getByText('Der Code ist ungültig oder abgelaufen.')).toBeVisible()
  await page.getByLabel('Einladungs-Code').fill('k7p3 9qxm')
  await page.getByRole('button', { name: 'Anfrage senden' }).click()
  await expect(page.getByRole('heading', { name: 'Warte auf Freigabe' })).toBeVisible()
  await expect(page.getByText(/Deine Anfrage an Zwieselwiesel ist gesendet/)).toBeVisible()

  // An admin approves on another device.
  server.memberships = [
    { organization_id: CLOUD_ORG, role: 'member', status: 'active', display_name: 'Mia' },
  ]
  server.orgName[CLOUD_ORG] = 'Zwieselwiesel'
  await page.getByRole('button', { name: 'Status prüfen' }).click()
  await expect(page.getByText('Zwieselwiesel · Mitarbeiter/in')).toBeVisible()
  // Members cannot invite.
  await expect(page.getByRole('button', { name: 'Einladungs-Code erstellen' })).toHaveCount(0)
  // This device now works for the cloud company – members only look at the company data.
  await page.getByRole('link', { name: 'Firma', exact: true }).click()
  await expect(page.getByLabel('Firmenname')).toHaveValue('Zwieselwiesel')
  await expect(page.getByText('Firmendaten, Logo und Nummern können nur Admins')).toBeVisible()
  await expect(page.getByLabel('Firmenname')).toBeDisabled()
  // Own device code for protocol numbers and an own profile in the company.
  await expect.poll(() => server.calls.includes('POST /rest/v1/rpc/set_my_worker')).toBe(true)
  await page.goto('/einstellungen')
  await expect(page.getByTestId('device-code')).toContainText('Gerätekürzel: M1')
  await page.goto('/profile/team')
  await expect(page.getByRole('link', { name: /Mia/ })).toBeVisible()
})

test('completed protocols go to the office by e-mail automatically', async ({ page }) => {
  const server = await fakeServer(page)
  await page.goto('/profile/firma')
  await page.getByLabel('Firmenname').fill('Zwieselwiesel')
  await page.getByLabel('E-Mail-Adressen für fertige Protokolle').fill('buero@example.de')
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()
  await page.getByRole('link', { name: /Firmen-Kartei/ }).click()
  await signIn(page)
  await page.getByRole('button', { name: 'Unsere Firma in die Cloud bringen' }).click()
  await page.getByLabel('Dein Name').fill('Anna Ast')
  await page.getByRole('button', { name: 'Firmen-Kartei anlegen' }).click()
  await expect(page.getByText('Zwieselwiesel · Inhaber/in')).toBeVisible()

  await fillCompleteAssessment(page)
  await signEveryone(page)
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Abschließen & PDF erstellen' }).click()
  await expect(page).toHaveURL(/\/protokoll\//, { timeout: 20_000 })
  // Sent by the server once protocol and PDF are uploaded.
  await expect(page.getByText(/^versendet /)).toBeVisible({ timeout: 15_000 })
  expect(server.calls.some((c) => c.startsWith('send '))).toBe(true)
  expect(server.calls).toContain('sync POST /rest/v1/attachments')
})
