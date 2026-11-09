import { expect, test, type Page } from '@playwright/test'

const save = (page: Page) => page.getByRole('button', { name: 'Speichern' }).click()
const saved = (page: Page) => expect(page.getByText('✓ Gespeichert')).toBeVisible()

async function drawSignature(page: Page) {
  const canvas = page.getByRole('img', { name: /Unterschriftenfeld/ })
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 20, box.y + box.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + 20 + i * 20, box.y + box.height / 2 + (i % 2 ? -25 : 25))
  }
  await page.mouse.up()
}

test('company profile with logo is saved and survives reload', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('link', { name: /Firma/ }).click()

  // Validation
  await page.getByLabel('Kürzel für Protokollnummern').fill('Z-W')
  await save(page)
  await expect(page.getByText('Firmenname ist ein Pflichtfeld.')).toBeVisible()
  await expect(page.getByText(/Kürzel: 1 bis 6/)).toBeVisible()

  await page.getByLabel('Firmenname').fill('Zwieselwiesel Baumpflege')
  await page.getByLabel('Kürzel für Protokollnummern').fill('ZW')
  await page.getByLabel('PLZ').fill('60311')
  await page.getByLabel('Ort').fill('Frankfurt')
  await page
    .getByLabel('E-Mail-Adressen für fertige Protokolle')
    .fill('buero@example.de\nchef@example.de')
  await page.locator('input[type=file]').setInputFiles('public/pwa-192x192.png')
  await expect(page.getByRole('img', { name: 'Firmenlogo' })).toBeVisible()
  await save(page)
  await saved(page)

  await page.reload()
  await expect(page.getByLabel('Firmenname')).toHaveValue('Zwieselwiesel Baumpflege')
  await expect(page.getByLabel('E-Mail-Adressen für fertige Protokolle')).toHaveValue(
    'buero@example.de\nchef@example.de',
  )
  // The logo blob was really stored in IndexedDB and decodes as an image.
  const logo = page.getByRole('img', { name: 'Firmenlogo' })
  await expect(logo).toBeVisible()
  expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(100)

  await page.getByRole('link', { name: 'Profile' }).first().click()
  await expect(page.getByText('Zwieselwiesel Baumpflege')).toBeVisible()
})

test('employee with qualification and stored signature', async ({ page }) => {
  await page.goto('/profile/mitarbeiter')
  await expect(page.getByText('Noch keine Mitarbeiter angelegt.')).toBeVisible()
  await page.getByRole('link', { name: '+ Neu' }).click()

  await save(page)
  await expect(page.getByText('Name ist ein Pflichtfeld.')).toBeVisible()

  await page.getByLabel('Name').fill('Anna Ast')
  await page.getByText('SKT A', { exact: true }).click()
  await page.getByLabel('Gültig bis (optional)').fill('2020-01-31')
  await page.getByText('AS-Baum II', { exact: true }).click()
  await drawSignature(page)
  await page.getByRole('button', { name: 'Unterschrift übernehmen' }).click()
  await expect(page.getByRole('img', { name: 'Unterschrift (gespeichert)' })).toBeVisible()
  await save(page)
  await saved(page)
  await expect(page).toHaveURL(/\/profile\/mitarbeiter\/[0-9a-f-]{36}$/)

  await page.reload()
  await expect(page.getByLabel('Name')).toHaveValue('Anna Ast')
  const sig = page.getByRole('img', { name: 'Unterschrift (gespeichert)' })
  await expect(sig).toBeVisible()
  expect(await sig.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

  await page.getByRole('link', { name: 'Mitarbeiter' }).click()
  await expect(page.getByText('AS-Baum II · SKT A (abgelaufen)')).toBeVisible()

  // Delete
  await page.getByRole('link', { name: /Anna Ast/ }).click()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Mitarbeiter/in löschen' }).click()
  await expect(page.getByText('Noch keine Mitarbeiter angelegt.')).toBeVisible()
})

test('subcontractor has a company field', async ({ page }) => {
  await page.goto('/profile/subunternehmer/neu')
  await page.getByLabel('Name').fill('Karl Kletter')
  await page.getByLabel('Firma').fill('Kletterteam Süd GmbH')
  await save(page)
  await saved(page)
  await page.getByRole('link', { name: 'Subunternehmer' }).click()
  await expect(page.getByText(/Kletterteam Süd GmbH/)).toBeVisible()
})

test('customer with objects', async ({ page }) => {
  await page.goto('/profile/kunden/neu')
  await page.getByLabel('Name').fill('Hausverwaltung Müller')
  await page.getByLabel('Ort').fill('Frankfurt')
  await page.getByRole('button', { name: '+ Objekt hinzufügen' }).click()
  await save(page)
  await expect(page.getByText('Bezeichnung ist ein Pflichtfeld.')).toBeVisible()

  const site = page.getByRole('group', { name: 'Objekt 1' })
  await site.getByLabel('Bezeichnung').fill('Wohnanlage Lindenstraße')
  await site.getByLabel('Straße und Hausnummer').fill('Lindenstraße 4')
  await expect(site.getByLabel('Ort')).toHaveValue('Frankfurt')
  await page.getByRole('button', { name: '+ Objekt hinzufügen' }).click()
  await page
    .getByRole('group', { name: 'Objekt 2' })
    .getByLabel('Bezeichnung')
    .fill('Kita Sonnenschein')
  await save(page)
  await saved(page)

  await page.reload()
  await expect(page.getByRole('group', { name: 'Objekt 2' }).getByLabel('Bezeichnung')).toHaveValue(
    'Kita Sonnenschein',
  )
  await page.getByRole('link', { name: 'Kunden' }).click()
  await expect(page.getByText('Frankfurt · 2 Objekte')).toBeVisible()
})

test('equipment preset', async ({ page }) => {
  await page.goto('/profile/ausruestung')
  await page.getByRole('button', { name: 'Alle auf „Ja“' }).click()
  await page
    .getByRole('group', { name: 'Funkgeräte geprüft' })
    .getByText('n. r.', { exact: true })
    .click()
  await save(page)
  await saved(page)
  await page.getByRole('link', { name: 'Profile' }).first().click()
  await expect(page.getByText('13 von 13 Punkten vorbelegt')).toBeVisible()
})

test('device code in settings', async ({ page }) => {
  await page.goto('/einstellungen')
  await page.getByLabel('Gerätekürzel (optional)').fill('t-2')
  await page.getByRole('button', { name: 'Kürzel speichern' }).click()
  await expect(page.getByLabel('Gerätekürzel (optional)')).toHaveValue('T2')
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Gerätekürzel (optional)')).toHaveValue('T2')
})

test('protocol number preview and continuing a series', async ({ page }) => {
  const year = new Date().getFullYear()
  await page.goto('/profile/firma')
  await page.getByLabel('Firmenname').fill('Zwieselwiesel Baumpflege')
  await page.getByLabel('Kürzel für Protokollnummern').fill('zw')
  // Live preview while typing.
  await expect(page.getByTestId('next-number')).toHaveText(`ZW-${year}-0001`)
  await expect(
    page.getByText(/Neues Kürzel: Nach dem Speichern beginnt eine neue Nummernreihe/),
  ).toBeVisible()
  await save(page)
  await saved(page)
  await expect(page.getByText(/Neues Kürzel/)).toHaveCount(0)

  await page.getByText('Bestehende Nummernreihe fortsetzen').click()
  const field = page.getByLabel(`Nächste laufende Nummer für ZW in ${year}`)
  await field.fill('57')
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(page.getByTestId('next-number')).toHaveText(`ZW-${year}-0057`)
  await expect(page.getByText('Zuletzt vergeben: Nr. 56')).toBeVisible()

  await field.fill('12')
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(page.getByText('Die Nummer muss mindestens 57 sein')).toBeVisible()
  await expect(page.getByTestId('next-number')).toHaveText(`ZW-${year}-0057`)
})
