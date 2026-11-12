import { expect, test, type Page } from '@playwright/test'
import { fillCompleteAssessment, signEveryone } from './helpers'

async function completeOne(page: Page) {
  await fillCompleteAssessment(page)
  await signEveryone(page)
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Abschließen & PDF erstellen' }).click()
  await expect(page).toHaveURL(/\/protokoll\//, { timeout: 20_000 })
}

test('backup: reminder, export, import on a fresh device', async ({ page, browser }) => {
  await completeOne(page)
  await page.goto('/')
  await expect(page.getByText('Es gibt noch kein Backup deiner Protokolle.')).toBeVisible()
  await page.getByRole('link', { name: 'Jetzt sichern' }).click()
  await expect(page.getByTestId('last-backup')).toHaveText('Noch kein Backup erstellt.')

  // Headless browsers cannot share files → the backup is downloaded.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Backup erstellen' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^BaumCheck-Backup_\d{4}-\d{2}-\d{2}\.zip$/)
  await expect(page.getByText(/Backup erstellt .*1 Einsätze, davon 1 abgeschlossen/)).toBeVisible()
  await expect(page.getByTestId('last-backup')).toHaveText(/^Letztes Backup: /)
  await page.goto('/')
  await expect(page.getByText('Es gibt noch kein Backup deiner Protokolle.')).toHaveCount(0)

  // New device: empty storage.
  const ctx = await browser.newContext()
  const fresh = await ctx.newPage()
  await fresh.goto('/archiv')
  await expect(fresh.getByText('Noch keine abgeschlossenen Protokolle.')).toBeVisible()
  await fresh.goto('/einstellungen')
  fresh.once('dialog', (d) => void d.accept())
  await fresh.locator('input[type=file][accept*="zip"]').setInputFiles(await download.path())
  await expect(fresh.getByText(/Backup eingespielt: \d+ neu/)).toBeVisible()
  await fresh.goto('/archiv')
  await fresh.getByRole('link', { name: /Lindenstraße 4/ }).click()
  await expect(fresh.getByTestId('pdf-integrity')).toHaveText('✓ PDF ist unverändert')
  await ctx.close()
})

test('a wrong file is rejected with a clear message', async ({ page }) => {
  await page.goto('/einstellungen')
  page.once('dialog', (d) => void d.accept())
  await page.locator('input[type=file][accept*="zip"]').setInputFiles({
    name: 'quatsch.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('kein zip'),
  })
  await expect(page.getByText('Die Datei ist kein BaumCheck-Backup.')).toBeVisible()
})

test('archive search and template for a recurring job', async ({ page }) => {
  await completeOne(page)
  await page.goto('/archiv')
  const search = page.getByLabel('Suchen')
  await search.fill('linden anna')
  await expect(page.getByText('1 von 1 Protokollen')).toBeVisible()
  await search.fill('Eiche')
  await expect(page.getByText('Keine Protokolle gefunden.')).toBeVisible()
  await search.fill('')
  await page.getByLabel('Einsatz von').fill('2000-01-01')
  await page.getByLabel('bis').fill('2000-12-31')
  await expect(page.getByText('Keine Protokolle gefunden.')).toBeVisible()
  await page.getByLabel('bis').fill('')

  await page.getByRole('link', { name: /Lindenstraße 4/ }).click()
  await page.getByRole('button', { name: 'Als Vorlage für neuen Einsatz' }).click()
  await expect(page).toHaveURL(/\/einsatz\/[0-9a-f-]{36}\/job$/)
  await expect(page.getByRole('checkbox', { name: 'Baumarbeiten (allgemein)' })).toBeChecked()
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByRole('textbox', { name: /Adresse/ })).toHaveValue(
    'Lindenstraße 4, 60311 Frankfurt',
  )
  // Checks are not copied.
  await expect(
    page.locator('#item-site-locationKnown').getByRole('radio', { name: 'Ja' }),
  ).not.toBeChecked()
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByRole('group', { name: 'Rollen von Anna Ast' })).toBeVisible()
})

test('next job at the same customer shows the last visit and takes over location data', async ({
  page,
}) => {
  await page.goto('/profile/kunden/neu')
  await page.getByLabel(/^Name/).fill('Hausverwaltung Müller')
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()

  await fillCompleteAssessment(page, { customer: 'Hausverwaltung Müller' })
  await signEveryone(page)
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Abschließen & PDF erstellen' }).click()
  await expect(page).toHaveURL(/\/protokoll\//, { timeout: 20_000 })

  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page).toHaveURL(/\/job$/)
  await page
    .getByRole('combobox', { name: 'Kunde / Objekt' })
    .selectOption({ label: 'Hausverwaltung Müller' })
  const card = page.getByRole('region', { name: 'Letzter Einsatz an diesem Objekt' })
  await expect(card).toContainText('Letzter Einsatz hier:')
  await expect(card).toContainText('Damals keine Gefahren oder Abweichungen festgestellt.')
  await card.getByRole('button', { name: 'Standort und Rettungsweg übernehmen' }).click()
  await expect(card.getByRole('button')).toHaveCount(0)
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByRole('textbox', { name: /Adresse/ })).toHaveValue(
    'Lindenstraße 4, 60311 Frankfurt',
  )
  await expect(page.getByRole('textbox', { name: /Zufahrt/ })).toHaveValue('Einfahrt Hofseite')

  // The tree from last time can be taken over; its last findings are shown for comparison.
  await page.goto(page.url().replace(/site$/, 'tree'))
  const earlier = page.getByRole('list', { name: 'Bäume vom letzten Einsatz' })
  await expect(earlier.getByRole('listitem')).toHaveCount(1)
  await expect(earlier).toContainText('Baum 1 · Winter-Linde')
  await expect(earlier).toContainText('Ergebnis: Ja')
  await earlier.getByRole('button', { name: 'Diesen Baum übernehmen' }).click()
  await expect(page.getByRole('heading', { name: 'Baum 1 · Winter-Linde' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Baumhöhe/ })).toHaveValue('18')
  await expect(page.getByRole('list', { name: 'Bäume vom letzten Einsatz' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByRole('region', { name: 'Letzter Befund' })).toContainText(
    'Damals keine Auffälligkeiten.',
  )
})

test.describe('with GPS', () => {
  test.use({
    permissions: ['geolocation'],
    geolocation: { latitude: 50.110924, longitude: 8.682127, accuracy: 4 },
  })

  test('the position of a tree is taken at the trunk', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
    await expect(page).toHaveURL(/\/job$/)
    await page.goto(page.url().replace(/job$/, 'tree'))
    await page.getByRole('button', { name: '+ Ersten Baum erfassen' }).click()
    await page.getByRole('button', { name: /Standort am Stamm übernehmen/ }).click()
    await expect(page.getByTestId('tree-position')).toHaveText('50.110924, 8.682127')
    await expect(page.getByText('± 4 m')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('tree-position')).toHaveText('50.110924, 8.682127')
    await page.getByRole('button', { name: 'Entfernen', exact: true }).click()
    await expect(page.getByTestId('tree-position')).toHaveCount(0)
  })
})
