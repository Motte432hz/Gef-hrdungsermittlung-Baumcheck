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
  await expect(page.getByRole('main').getByText('Zwieselwiesel Baumpflege')).toBeVisible()
})

test('employee with qualification and stored signature', async ({ page }) => {
  await page.goto('/profile/mitarbeiter')
  await expect(page.getByText('Noch keine Mitarbeiter angelegt.')).toBeVisible()
  await page.getByRole('link', { name: '+ Neu' }).click()

  await save(page)
  await expect(page.getByText('Name ist ein Pflichtfeld.')).toBeVisible()

  await page.getByLabel(/^Name/).fill('Anna Ast')
  await page.getByLabel('Rufname (optional)').fill('Änni')
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
  await expect(page.getByLabel(/^Name/)).toHaveValue('Anna Ast')
  const sig = page.getByRole('img', { name: 'Unterschrift (gespeichert)' })
  await expect(sig).toBeVisible()
  expect(await sig.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

  await page.getByRole('link', { name: 'Mitarbeiter' }).click()
  await expect(page.getByText('Anna Ast „Änni“')).toBeVisible()
  await expect(page.getByText('AS-Baum II · SKT A (abgelaufen)')).toBeVisible()

  // Delete
  await page.getByRole('link', { name: /Anna Ast/ }).click()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Mitarbeiter/in löschen' }).click()
  await expect(page.getByText('Noch keine Mitarbeiter angelegt.')).toBeVisible()
})

test('subcontractor has a company field', async ({ page }) => {
  await page.goto('/profile/subunternehmer/neu')
  await page.getByLabel(/^Name/).fill('Karl Kletter')
  await page.getByLabel('Firma').fill('Kletterteam Süd GmbH')
  await save(page)
  await saved(page)
  await page.getByRole('link', { name: 'Subunternehmer' }).click()
  await expect(page.getByText(/Kletterteam Süd GmbH/)).toBeVisible()
})

test('customer with objects', async ({ page }) => {
  await page.goto('/profile/kunden/neu')
  await page.getByLabel(/^Name/).fill('Hausverwaltung Müller')
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

test('PPE and gear per person with instant search, free entry and inspection warning', async ({
  page,
}) => {
  await page.goto('/profile/mitarbeiter/neu')
  await page.getByLabel(/^Name/).fill('Anna Ast')

  const add = page.getByRole('combobox', { name: 'Ausrüstung hinzufügen' })
  await add.fill('spider')
  await expect(page.getByRole('option').first()).toContainText('SpiderJack 3')
  await page.getByRole('option', { name: /SpiderJack 3/ }).click()
  await page.getByLabel('Seriennummer (optional)').fill('SJ-123')
  await page.getByLabel('Nächste Prüfung (optional)').fill('2020-01-31')

  await add.fill('Mein Spezialhaken')
  await page
    .getByRole('option', { name: '„Mein Spezialhaken“ als eigene Ausrüstung übernehmen' })
    .click()

  const list = page.getByRole('list', { name: 'Ausrüstung' })
  await expect(list.getByRole('listitem')).toHaveCount(2)
  await expect(list).toContainText('Prüfung überfällig')
  await save(page)
  await saved(page)

  await page.reload()
  await expect(page.getByRole('list', { name: 'Ausrüstung' })).toContainText('SpiderJack 3')
  await expect(page.getByRole('list', { name: 'Ausrüstung' })).toContainText('Nr. SJ-123')

  // In an assessment the team shows the gear and warns about the overdue inspection.
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page).toHaveURL(/\/job$/)
  await page.goto(page.url().replace(/job$/, 'team'))
  await page.getByRole('button', { name: /^Anna Ast/ }).click()
  await expect(page.getByText('PSA: SpiderJack 3, Mein Spezialhaken')).toBeVisible()
  await expect(
    page.getByText(/Prüfung von SpiderJack 3 \(Anna Ast\) war am 31\.01\.2020 fällig\./),
  ).toBeVisible()
})

test('logo colours are detected and applied to the app; company logo and name in the header', async ({
  page,
}) => {
  await page.goto('/profile/firma')
  await page.getByLabel('Firmenname').fill('Rotbuche Baumpflege')
  await page.getByLabel('Kürzel für Protokollnummern').fill('RB')
  const redLogo =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#ffffff"/><circle cx="100" cy="100" r="80" fill="#e30613"/></svg>'
  await page.locator('input[type=file]').setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(redLogo),
  })
  // A red suggestion appears and is pre-selected; both toggles are on.
  const swatch = page.getByRole('button', { name: /^Farbe #[0-9a-f]{6} wählen$/ }).first()
  await expect(swatch).toHaveAttribute('aria-pressed', 'true')
  const chosen = (await swatch.getAttribute('aria-label'))!.match(/#[0-9a-f]{6}/)![0]
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(chosen.slice(i, i + 2), 16))
  expect(r).toBeGreaterThan(180)
  expect(g + b).toBeLessThan(120)
  await expect(page.getByRole('checkbox', { name: /Farbe in der App verwenden/ })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /Farbe im PDF verwenden/ })).toBeChecked()

  await page.getByText('Tabelle', { exact: true }).click()
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()

  // The app now uses a red tone instead of the default green (applied right after saving).
  const readBrand = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-brand-700').trim(),
    )
  await expect.poll(readBrand).not.toBe('#1f5130')
  const brand = await readBrand()
  expect(parseInt(brand.slice(1, 3), 16)).toBeGreaterThan(parseInt(brand.slice(3, 5), 16))

  await expect(page.getByTestId('brand-mark').filter({ visible: true })).toContainText(
    'Rotbuche Baumpflege',
  )
  await expect(page.getByTestId('brand-mark').filter({ visible: true })).toContainText(
    'mit BaumCheck',
  )

  // Back to the standard colour.
  await page.getByRole('button', { name: 'Standardfarbe' }).click()
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-brand-700').trim(),
      ),
    )
    .toBe('#1f5130')
})

test('sample PDF opens', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/profile/firma')
  const button = page.getByRole('button', { name: 'Muster-PDF ansehen' })
  const [popup] = await Promise.all([context.waitForEvent('page'), button.click()])
  expect(popup).toBeTruthy()
  // Generation finishes (headless Chromium has no PDF viewer, so the file itself is not shown).
  await expect(button).toBeEnabled()
  expect(errors).toEqual([])
})

test('two brand colours from a two-colour logo; experimental layout can be chosen', async ({
  page,
}) => {
  await page.goto('/profile/firma')
  await page.getByLabel('Firmenname').fill('Zwei Farben GmbH')
  const logo =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#ffffff"/><rect x="0" y="0" width="200" height="120" fill="#1565c0"/><rect x="0" y="120" width="200" height="80" fill="#f2a900"/></svg>'
  await page.locator('input[type=file]').setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(logo),
  })
  // Main colour blue, second colour yellow – both detected automatically.
  await expect(page.getByRole('button', { name: /^Farbe #/ }).first()).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const second = page.getByRole('button', {
    name: /^Zweitfarbe #[0-9a-f]{6} wählen$/,
    pressed: true,
  })
  await expect(second).toHaveCount(1)
  // Harmony suggestions are offered too.
  await expect(page.getByRole('button', { name: 'Zweitfarbe Kontrast wählen' })).toBeVisible()

  await page.getByRole('radio', { name: /Seitenleiste/ }).check()
  await expect(page.getByRole('radio', { name: /Seitenleiste/ })).toBeChecked()
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()

  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-accent-500').trim(),
      ),
    )
    .not.toBe('#2f7a47')
  const [brand, accent] = await page.evaluate(() => {
    const st = getComputedStyle(document.documentElement)
    return [
      st.getPropertyValue('--color-brand-700').trim(),
      st.getPropertyValue('--color-accent-500').trim(),
    ]
  })
  expect(brand).not.toBe(accent)
  // Blue main colour, yellowish accent.
  expect(parseInt(brand.slice(5, 7), 16)).toBeGreaterThan(parseInt(brand.slice(1, 3), 16))
  expect(parseInt(accent.slice(1, 3), 16)).toBeGreaterThan(parseInt(accent.slice(5, 7), 16))

  await page.reload()
  await expect(page.getByRole('radio', { name: /Seitenleiste/ })).toBeChecked()
})

test('settings: switch between BaumCheck and company colours (colours taken from the logo)', async ({
  page,
}) => {
  // No logo yet: a hint points to the company profile.
  await page.goto('/einstellungen')
  await page.getByText('Firmenfarben', { exact: true }).click()
  await expect(page.getByText('Noch kein Logo und keine Firmenfarbe hinterlegt.')).toBeVisible()

  // Logo saved, but without colours.
  await page.goto('/profile/firma')
  await page.getByLabel('Firmenname').fill('Blaue Eiche')
  const logo =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#ffffff"/><circle cx="100" cy="100" r="80" fill="#1565c0"/></svg>'
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'l.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(logo) })
  await expect(page.getByRole('button', { name: /^Farbe #/ }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Standardfarbe' }).click()
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()

  await page.goto('/einstellungen')
  const readBrand = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-brand-700').trim(),
    )
  expect(await readBrand()).toBe('#1f5130')
  await page.getByText('Firmenfarben', { exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Firmenfarben' })).toBeChecked()
  await expect.poll(readBrand).not.toBe('#1f5130')
  // The header is now coloured.
  const header = page.getByRole('banner')
  await expect(header).toHaveClass(/bg-brand-700/)

  await page.getByText('BaumCheck', { exact: true }).click()
  await expect.poll(readBrand).toBe('#1f5130')
  await expect(header).not.toHaveClass(/bg-brand-700/)
})
