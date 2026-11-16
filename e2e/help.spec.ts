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
  await page.goto('/hilfe')
  await page.getByRole('link', { name: /Begriffe A–Z/ }).click()
  await expect(page.getByRole('heading', { name: 'Begriffe A–Z' })).toBeVisible()
  await page.getByLabel('Begriff suchen').fill('Brennhaare')
  await expect(page.getByText('Eichenprozessionsspinner', { exact: true })).toBeVisible()
  await expect(page.getByText('Druckzwiesel', { exact: true })).toBeHidden()
  await page.getByLabel('Begriff suchen').fill('xyzxyz')
  await expect(page.getByText('Kein Begriff gefunden.', { exact: false })).toBeVisible()
})

test('help for the current page and step', async ({ page }) => {
  await page.goto('/profile/team')
  await page.getByRole('button', { name: 'Hilfe zu „Team & Partner“' }).click()
  const sheet = page.getByRole('dialog', { name: 'Hilfe: Team & Partner' })
  await sheet.getByRole('button', { name: 'Mitarbeiter und Subunternehmer anlegen' }).click()
  await expect(sheet.getByText(/Team & Partner“ öffnen/)).toBeVisible()
  await sheet.getByRole('link', { name: 'Alle Hilfethemen' }).click()
  await expect(page).toHaveURL(/\/hilfe$/)
  await page.getByRole('link', { name: /Korrigieren|korrigieren/ }).click()
  await expect(page.getByRole('heading', { name: 'Ein abgeschlossenes Protokoll korrigieren' })).toBeVisible()

  // In the wizard: help for the step, without leaving the protocol
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await page.getByRole('button', { name: 'Hilfe zu „Einsatz“' }).click()
  const stepSheet = page.getByRole('dialog', { name: 'Hilfe: Einsatz' })
  await expect(stepSheet.getByText(/Einsatzart und die geplanten Arbeiten/)).toBeVisible()
  await expect(stepSheet.getByRole('link')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(stepSheet).toBeHidden()
})

test('tour can be run and restarted', async ({ page }) => {
  await page.goto('/hilfe')
  await page.getByRole('link', { name: /Rundgang starten/ }).click()
  await expect(page.getByRole('heading', { name: 'Willkommen' })).toBeVisible()
  await expect(page.getByText('Rundgang · 1 von 8')).toBeVisible()
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByRole('heading', { name: 'Hilfe ist immer da' })).toBeVisible()
  await page.getByRole('button', { name: 'Los geht’s' }).click()
  await expect(page).toHaveURL(/\/$/)
})
