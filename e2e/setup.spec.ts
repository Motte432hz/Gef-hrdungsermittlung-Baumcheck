import { expect, test } from '@playwright/test'
import { fillCompleteAssessment, signEveryone } from './helpers'

test('welcome, setup assistant and checklist', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Willkommen! Wie möchtest du starten/ }),
  ).toBeVisible()
  await page.getByRole('link', { name: /Ich richte meine Firma ein/ }).click()

  // 1 Company: the prefix follows the name
  await expect(page.getByText('Einrichtung · Schritt 1 von 6')).toBeVisible()
  await page.getByLabel('Firmenname').fill('Zwieselwiesel Baumpflege')
  await expect(page.getByLabel('Kürzel für Protokollnummern')).toHaveValue('ZB')
  await page.getByLabel('Telefon').fill('0761 123456')
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()
  await page.getByRole('button', { name: 'Weiter ›' }).click()

  // 2 Yourself
  await page.getByLabel('Dein Name').fill('Mia Moos')
  await page.getByText('SKT A', { exact: true }).click()
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()
  await page.getByRole('button', { name: 'Weiter ›' }).click()

  // 3 Team: you are already listed; add one more
  await expect(page.getByText('Mia Moos')).toBeVisible()
  await page.getByLabel('Name', { exact: true }).fill('Ben Borke')
  await page.getByRole('button', { name: '+ Hinzufügen' }).click()
  await expect(page.getByText('Im Team (2)')).toBeVisible()
  await page.getByRole('button', { name: 'Weiter ›' }).click()

  // 4 Equipment
  await page.getByRole('button', { name: /Alles mit „Ja“ vorbelegen/ }).click()
  await expect(page.getByText(/Punkte sind vorbelegt/)).toBeVisible()
  await page.getByRole('button', { name: 'Weiter ›' }).click()

  // 5 Safety, 6 Done
  await expect(page.getByRole('link', { name: /Firmen-Kartei einrichten/ })).toBeVisible()
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByRole('heading', { name: 'Gut gemacht!' })).toBeVisible()
  await expect(page.getByText('Einrichtung: 3 von 6 erledigt')).toBeVisible()
  await page.getByRole('link', { name: 'Zur Startseite' }).click()

  // The start page shows the checklist instead of the welcome
  await expect(page.getByRole('heading', { name: 'Einrichtung · 3 von 6 erledigt' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Logo hochladen/ })).toBeVisible()
  await page.getByRole('button', { name: 'Checkliste ausblenden' }).click()
  await expect(page.getByRole('heading', { name: /Einrichtung ·/ })).toBeHidden()

  // The profile from the assistant is in Team & Partner
  await page.goto('/profile/team')
  await expect(page.getByText('Mia Moos')).toBeVisible()
})

test('later: the welcome gives way to the checklist', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Später' }).click()
  await expect(page.getByRole('heading', { name: 'Einrichtung · 0 von 6 erledigt' })).toBeVisible()
})

test('practice run: no number, not in the archive, can be deleted', async ({ page }) => {
  await fillCompleteAssessment(page, { practice: true })
  await expect(page.getByText(/Übungseinsatz – bekommt keine Protokollnummer/)).toBeVisible()
  await signEveryone(page)
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Abschließen & PDF erstellen' }).click()
  await expect(page.getByRole('heading', { name: 'Übungseinsatz' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText('Geschafft – das war ein Übungseinsatz.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Korrektur' })).toBeHidden()

  await page.goto('/archiv')
  await expect(page.getByText('Noch keine abgeschlossenen Protokolle.')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Abgeschlossene Übungen' })).toBeVisible()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: /^Übung vom .* löschen$/ }).click()
  await expect(page.getByRole('heading', { name: 'Abgeschlossene Übungen' })).toBeHidden()
})
