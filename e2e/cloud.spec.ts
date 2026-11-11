import { expect, test, type Page } from '@playwright/test'

// The cloud server is simulated: no real e-mails, no real accounts.
// Service workers would bypass page.route in WebKit, so they are blocked here.
test.use({ serviceWorkers: 'block' })

const SB = 'https://fjrhcvgiyivanikgazyk.supabase.co'
const USER = { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'anna@example.de' }
const CLOUD_ORG = 'cccccccc-0000-0000-0000-000000000001'

interface Server {
  memberships: { organization_id: string; role: string; status: string; display_name: string }[]
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
    const body = route.request().postDataJSON?.() as Record<string, unknown> | undefined
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
    if (path === '/rest/v1/memberships') return route.fulfill(json(s.memberships))
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
          role: 'owner',
          status: 'active',
          display_name: body!.p_display_name as string,
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
  await page.getByLabel('E-Mail-Adresse').fill('Anna@Example.de ')
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
  // This device now works for the cloud company.
  await page.getByRole('link', { name: 'Firma', exact: true }).click()
  await expect(page.getByLabel('Firmenname')).toHaveValue('Zwieselwiesel')
})
