import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const PNG = readFileSync('public/pwa-64x64.png')

// With an active service worker, WebKit bypasses page.route for fetches → block it here.
test.use({ serviceWorkers: 'block' })

test.beforeEach(async ({ page }) => {
  // Never hit real OSM servers from tests.
  await page.route('https://tile.openstreetmap.org/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: PNG,
    }),
  )
  await page.route('https://nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      // Like the real server; WebKit enforces CORS even for mocked responses.
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        address: {
          road: 'Lindenstraße',
          house_number: '4',
          postcode: '60311',
          city: 'Frankfurt am Main',
        },
      }),
    }),
  )
})

const cors = { 'Access-Control-Allow-Origin': '*' }

/** Hospital search (Overpass) and weather (Bright Sky) – simulated. */
async function fakeOnlineHelp(page: Page) {
  // Nominatim search (registered after the reverse lookup above, so it takes precedence).
  await page.route('https://nominatim.openstreetmap.org/search**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify([
        { lat: '50.115', lon: '8.69', name: 'Klinik ohne Notaufnahme', address: {}, extratags: {} },
        {
          lat: '50.095',
          lon: '8.66',
          name: 'Uniklinik Frankfurt',
          address: {
            road: 'Theodor-Stern-Kai',
            house_number: '7',
            postcode: '60590',
            city: 'Frankfurt',
          },
          extratags: { emergency: 'yes', phone: '069 6301 0' },
        },
      ]),
    }),
  )
  await page.route('https://overpass-api.de/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify({
        elements: [
          { lat: 50.115, lon: 8.69, tags: { name: 'Klinik ohne Notaufnahme' } },
          {
            lat: 50.095,
            lon: 8.66,
            tags: {
              name: 'Uniklinik Frankfurt',
              emergency: 'yes',
              'addr:street': 'Theodor-Stern-Kai',
              'addr:housenumber': '7',
              'addr:postcode': '60590',
              'addr:city': 'Frankfurt',
              phone: '069 6301 0',
            },
          },
        ],
      }),
    }),
  )
  await page.route('https://api.brightsky.dev/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify(
        r.request().url().includes('/alerts')
          ? {
              alerts: [
                {
                  event_de: 'STURMBÖEN',
                  headline_de: 'Amtliche WARNUNG vor STURMBÖEN',
                  severity: 'moderate',
                },
              ],
            }
          : { weather: { wind_speed_10: 25, wind_gust_speed_10: 62, condition: 'dry' } },
      ),
    }),
  )
}

async function openSiteStep(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page).toHaveURL(/job$/)
  await page.goto(page.url().replace(/job$/, 'site'))
  await expect(page.getByText('Schritt 2 von 7')).toBeVisible()
}

test.describe('with GPS', () => {
  test.use({
    permissions: ['geolocation'],
    geolocation: { latitude: 50.110924, longitude: 8.682127, accuracy: 6 },
  })

  test('captures position, shows map and suggests the address', async ({ page }) => {
    await openSiteStep(page)
    await page.getByRole('button', { name: /Standort bestimmen/ }).click()
    await expect(page.getByTestId('gps-decimal')).toHaveText('50.110924, 8.682127')
    await expect(page.getByText(/Genauigkeit ± 6 m/)).toBeVisible()
    await expect(page.getByRole('img', { name: 'Karte mit Standort' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'In Karten-App öffnen' })).toHaveAttribute(
      'href',
      /50\.110924/,
    )

    await page.getByRole('button', { name: 'Adresse aus GPS vorschlagen' }).click()
    await expect(page.getByText('Lindenstraße 4, 60311 Frankfurt am Main')).toBeVisible()
    await page.getByRole('button', { name: 'Übernehmen' }).click()
    const address = page.getByRole('textbox', { name: /Adresse/ })
    await expect(address).toHaveValue('Lindenstraße 4, 60311 Frankfurt am Main')

    // Emergency card collects everything for the call.
    const card = page.getByRole('region', { name: 'Notfallinfo' })
    await expect(card).toContainText('Adresse: Lindenstraße 4, 60311 Frankfurt am Main')
    await expect(card).toContainText('Koordinaten: 50.110924, 8.682127')
    await expect(card.getByRole('link', { name: /112 anrufen/ })).toHaveAttribute('href', 'tel:112')

    await page.reload()
    await expect(page.getByTestId('gps-decimal')).toHaveText('50.110924, 8.682127')
    await expect(page.getByRole('textbox', { name: /Adresse/ })).toHaveValue(
      'Lindenstraße 4, 60311 Frankfurt am Main',
    )
  })

  test('nearest emergency department and weather at the site', async ({ page }) => {
    await fakeOnlineHelp(page)
    await openSiteStep(page)
    await page.getByRole('button', { name: /Standort bestimmen/ }).click()
    await expect(page.getByTestId('gps-decimal')).toBeVisible()

    await page.getByRole('button', { name: 'Nächste Notaufnahme suchen' }).click()
    const list = page.getByRole('list', { name: 'Krankenhäuser in der Nähe' })
    await expect(list.getByRole('listitem').first()).toContainText('Uniklinik Frankfurt')
    await expect(list.getByRole('listitem').first()).toContainText('✚ Notaufnahme')
    await list.getByRole('listitem').first().getByRole('button', { name: 'Übernehmen' }).click()
    await expect(page.getByRole('textbox', { name: 'Nächstes Krankenhaus' })).toHaveValue(
      'Uniklinik Frankfurt, Theodor-Stern-Kai 7, 60590 Frankfurt, Tel. 069 6301 0',
    )

    await page.goto(page.url().replace(/site$/, 'workplace'))
    const weather = page.getByRole('region', { name: 'Wetter am Einsatzort' })
    await expect(weather).toContainText('Wind 25 km/h, Böen 62 km/h – starke Böen')
    await expect(weather).toContainText('Amtliche WARNUNG vor STURMBÖEN')
  })

  test('offline: no map and no address lookup, coordinates still work', async ({
    page,
    context,
  }) => {
    await openSiteStep(page)
    await context.setOffline(true)
    await page.getByRole('button', { name: /Standort bestimmen/ }).click()
    await expect(page.getByTestId('gps-decimal')).toHaveText('50.110924, 8.682127')
    await expect(page.getByText(/Offline: keine Karte/)).toBeVisible()
    await expect(page.getByRole('img', { name: 'Karte mit Standort' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Adresse aus GPS vorschlagen' })).toHaveCount(0)
    await expect(page.getByText(/Ohne Netz kann keine Adresse/)).toBeVisible()
    await context.setOffline(false)
  })

  test('imprecise position shows a hint in the summary', async ({ page, context }) => {
    await context.setGeolocation({ latitude: 50.11, longitude: 8.68, accuracy: 120 })
    await openSiteStep(page)
    await page.getByRole('button', { name: /Standort bestimmen/ }).click()
    // Not precise enough for auto-accept: take the best fix manually.
    await page.getByRole('button', { name: 'Jetzt übernehmen' }).click()
    await expect(page.getByTestId('gps-decimal')).toHaveText('50.110000, 8.680000')
    await expect(page.getByText(/Genauigkeit ± 120 m ·/)).toBeVisible()
    await page.goto(page.url().replace(/site$/, 'summary'))
    await expect(page.getByText(/GPS-Position ist ungenau \(± 120 m\)/)).toBeVisible()
  })
})

test('denied permission explains what to do', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'permission prompt handling differs per engine')
  await openSiteStep(page)
  await page.getByRole('button', { name: /Standort bestimmen/ }).click()
  await expect(page.getByText(/Zugriff auf den Standort wurde nicht erlaubt/)).toBeVisible({
    timeout: 25_000,
  })
})
