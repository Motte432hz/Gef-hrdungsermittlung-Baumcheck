import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const PNG = readFileSync('public/pwa-64x64.png')

test.beforeEach(async ({ page }) => {
  // Never hit real OSM servers from tests.
  await page.route('https://tile.openstreetmap.org/**', (r) =>
    r.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  )
  await page.route('https://nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
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

async function openSiteStep(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page).toHaveURL(/job$/)
  await page.goto(page.url().replace(/job$/, 'site'))
  await expect(page.getByText('Schritt 2 von 9')).toBeVisible()
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
