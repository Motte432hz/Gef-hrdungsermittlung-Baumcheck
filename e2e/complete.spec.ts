import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fillCompleteAssessment, signEveryone, waitForServiceWorker } from './helpers'

async function completeNow(page: Page) {
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Abschließen & PDF erstellen' }).click()
  await expect(page).toHaveURL(/\/protokoll\/[0-9a-f-]{36}$/, { timeout: 20_000 })
}

test('complete: PDF is created, locked, downloadable and listed in the archive', async ({
  page,
}) => {
  await page.goto('/profile/firma')
  await page.getByLabel('Firmenname').fill('Zwieselwiesel Baumpflege')
  await page.getByLabel('Kürzel für Protokollnummern').fill('ZW')
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()

  await fillCompleteAssessment(page)
  const button = page.getByRole('button', { name: 'Abschließen & PDF erstellen' })
  await expect(button).toBeDisabled()
  await signEveryone(page)
  await expect(button).toBeEnabled()
  await completeNow(page)

  const year = new Date().getFullYear()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Protokoll ZW-${year}-0001`)
  await expect(page.getByText('abgeschlossen und gesperrt')).toBeVisible()
  await expect(page.getByTestId('pdf-integrity')).toHaveText('✓ PDF ist unverändert')

  // Download and check the file.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Speichern' }).click(),
  ])
  expect(download.suggestedFilename()).toBe(`Gefaehrdungsermittlung_ZW-${year}-0001.pdf`)
  const bytes = readFileSync(await download.path())
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  expect(bytes.byteLength).toBeGreaterThan(10_000)

  // Locked: the wizard URL redirects to the protocol.
  const id = page.url().split('/').pop()
  await page.goto(`/einsatz/${id}/team`)
  await expect(page).toHaveURL(new RegExp(`/protokoll/${id}$`))

  // Mark as sent.
  await page.getByRole('button', { name: 'Als versendet markieren' }).click()
  await expect(page.getByText(/^versendet /)).toBeVisible()

  // Archive and start page.
  await page.goto('/archiv')
  await expect(
    page.getByRole('link', { name: new RegExp(`ZW-${year}-0001 · Lindenstraße 4`) }),
  ).toContainText('versendet')
  await page.goto('/')
  await expect(page.getByText('Noch keine angefangenen Einsätze.')).toBeVisible()
})

test('correction creates a new version that references the original', async ({ page }) => {
  await fillCompleteAssessment(page)
  await signEveryone(page)
  await completeNow(page)
  const originalUrl = page.url()

  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Neue Version anlegen' }).click()
  await expect(page).toHaveURL(/\/einsatz\/[0-9a-f-]{36}\/job$/)
  // Answers are copied, signatures are not.
  await page.goto(page.url().replace(/job$/, 'summary'))
  await expect(
    page.getByRole('region', { name: 'Unterschriften' }).getByRole('heading'),
  ).toHaveText('Unterschriften (0 von 2)')
  await signEveryone(page)
  await completeNow(page)
  const year = new Date().getFullYear()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Protokoll BC-${year}-0002`)
  await expect(page.getByText(/Version 2/)).toBeVisible()
  await page.getByRole('link', { name: 'die vorherige Version' }).click()
  await expect(page).toHaveURL(originalUrl)
  await expect(page.getByText('Es gibt eine neuere Version dieses Protokolls.')).toBeVisible()
})

test('completing works offline', async ({ page, context, browserName }) => {
  test.skip(
    browserName !== 'chromium',
    'offline emulation with service worker only reliable in Chromium',
  )
  await page.goto('/')
  await waitForServiceWorker(page)
  await fillCompleteAssessment(page)
  await signEveryone(page)
  await context.setOffline(true)
  await completeNow(page)
  await expect(page.getByTestId('pdf-integrity')).toHaveText('✓ PDF ist unverändert')
  await context.setOffline(false)
})

test('order confirmation and invoice can be attached after completion', async ({ page }) => {
  await fillCompleteAssessment(page)
  await signEveryone(page)
  await completeNow(page)

  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Auftrag & Rechnung' }) })
  await expect(card.getByText('Noch kein Dokument angehängt.', { exact: false })).toBeVisible()

  // Photo of a paper → crop editor → saved as a cleaned-up scan.
  await card.getByTestId('document-file').setInputFiles('public/pwa-512x512.png')
  const editor = page.getByRole('dialog', { name: 'Dokument zuschneiden' })
  const canvas = editor.getByRole('img', { name: 'Dokument mit Zuschnitt' })
  await expect(canvas).toBeVisible()
  const box = (await canvas.boundingBox())!
  // Drag the top-left corner inwards.
  await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.05)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2, { steps: 4 })
  await page.mouse.up()
  await editor.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(editor).toHaveCount(0)

  // An invoice as PDF.
  await card.getByText('Rechnung', { exact: true }).click()
  await card.getByTestId('document-file').setInputFiles({
    name: 'Rechnung-2026-17.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%%EOF'),
  })
  const docs = card.getByRole('list', { name: 'Dokumente' })
  await expect(docs.getByRole('listitem')).toHaveCount(2)
  await expect(docs).toContainText('Auftragsbestätigung')
  await expect(docs).toContainText('Rechnung-2026-17.pdf')

  // The protocol itself stays untouched.
  await expect(page.getByTestId('pdf-integrity')).toHaveText('✓ PDF ist unverändert')
  await page.reload()
  await expect(docs.getByRole('listitem')).toHaveCount(2)
})
