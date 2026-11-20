import { expect, test } from '@playwright/test'
import { fillCompleteAssessment, signEveryone } from './helpers'

async function completeOne(page: import('@playwright/test').Page, customer?: string) {
  await fillCompleteAssessment(page, customer ? { customer } : {})
  await signEveryone(page)
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Abschließen & PDF erstellen' }).click()
  await expect(page).toHaveURL(/\/protokoll\//, { timeout: 20_000 })
}

test('job template: save from a protocol, start from the home page', async ({ page }) => {
  await completeOne(page)
  await page.getByRole('button', { name: 'Vorlage anlegen …' }).click()
  await page.getByLabel('Name der Vorlage').fill('Totholz Standard')
  await page.getByRole('button', { name: 'Vorlage speichern' }).click()
  await expect(
    page.getByText('✓ Vorlage „Totholz Standard“ gespeichert.', { exact: false }),
  ).toBeVisible()

  await page.goto('/')
  await page
    .getByRole('region', { name: 'Mit Vorlage starten' })
    .getByRole('button', { name: /Totholz Standard/ })
    .click()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Totholzentnahme' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Baumarbeiten (allgemein)' })).toBeChecked()
  await page.goto(page.url().replace(/job$/, 'team'))
  await expect(page.getByText('Anna Ast').first()).toBeVisible()

  // Manage: rename and delete
  await page.goto('/profile/vorlagen')
  const row = page.getByRole('listitem', { name: 'Vorlage Totholz Standard' })
  await row.getByRole('button', { name: 'Umbenennen' }).click()
  await page.getByLabel('Name der Vorlage').fill('Totholz klein')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Totholz klein', { exact: true })).toBeVisible()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Löschen' }).click()
  await expect(page.getByText('Noch keine Vorlagen.')).toBeVisible()
})

test('everything like last time at the same customer', async ({ page }) => {
  await page.goto('/profile/kunden/neu')
  await page.getByLabel(/^Name/).fill('Hausverwaltung Müller')
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()
  await completeOne(page, 'Hausverwaltung Müller')

  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await page
    .getByRole('combobox', { name: 'Kunde / Objekt' })
    .selectOption({ label: 'Hausverwaltung Müller' })
  const card = page.getByRole('region', { name: 'Letzter Einsatz an diesem Objekt' })
  await card.getByRole('button', { name: '↻ Alles wie beim letzten Mal' }).click()
  await expect(card.getByText(/✓ Übernommen: .*Team \(2\), 1 Baum/)).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Totholzentnahme' })).toBeChecked()
  await page.goto(page.url().replace(/job$/, 'site'))
  await expect(page.getByRole('textbox', { name: /Zufahrt/ })).toHaveValue('Einfahrt Hofseite')
})
