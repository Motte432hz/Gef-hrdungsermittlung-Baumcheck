import { expect, test } from '@playwright/test'

test('explains questions and technical terms in the wizard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
  // Step intro
  await expect(page.getByText(/Was wird heute gemacht, für wen/)).toBeVisible()

  // "?" shows what is meant and why it is asked
  const types = page.locator('[id^="item-"]').filter({ hasText: 'Einsatzart' })
  await types.getByRole('button', { name: 'Erklärung anzeigen' }).first().click()
  await expect(types.getByText('Worum geht es?')).toBeVisible()
  await expect(types.getByText('Warum ist das wichtig?')).toBeVisible()

  // Technical terms open a short explanation
  await types.getByRole('button', { name: 'Hubarbeitsbühne' }).click()
  const sheet = page.getByRole('dialog', { name: 'Hubarbeitsbühne' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText(/Fahrbare Arbeitsplattform/)).toBeVisible()
  await sheet.getByRole('button', { name: 'Schließen' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('checkbox', { name: /Hubarbeitsbühne/ })).not.toBeChecked()
})

test('glossary A–Z with search', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Hilfe' }).first().click()
  await page.getByRole('link', { name: /Begriffe A–Z/ }).click()
  await expect(page.getByRole('heading', { name: 'Begriffe A–Z' })).toBeVisible()
  await page.getByLabel('Begriff suchen').fill('Brennhaare')
  await expect(page.getByText('Eichenprozessionsspinner', { exact: true })).toBeVisible()
  await expect(page.getByText('Druckzwiesel', { exact: true })).toBeHidden()
  await page.getByLabel('Begriff suchen').fill('xyzxyz')
  await expect(page.getByText('Kein Begriff gefunden.', { exact: false })).toBeVisible()
})
