import { expect, test } from '@playwright/test'

test('quick mode: one question at a time, measure on "Nein", back and done', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
  await page.goto(page.url().replace(/job$/, 'team'))

  await page.getByRole('button', { name: /Schnellmodus: Karte für Karte/ }).click()
  const quick = page.getByRole('dialog', { name: 'Schnellmodus' })
  await expect(quick.getByText('Frage 1 von 5')).toBeVisible()
  await expect(quick.getByText('Der Arbeitsauftrag wurde mit allen besprochen')).toBeVisible()
  await quick.getByRole('button', { name: '✓ Ja' }).click()

  // "Nein" asks for the measure before going on
  await expect(quick.getByText('Frage 2 von 5')).toBeVisible()
  await quick.getByRole('button', { name: '✗ Nein' }).click()
  const next = quick.getByRole('button', { name: 'Weiter ›' })
  await expect(next).toBeDisabled()
  await quick.getByRole('textbox').fill('Einteilung vor Ort nachgeholt')
  await next.click()
  await expect(quick.getByText('Frage 3 von 5')).toBeVisible()

  // Back shows the previous answer
  await quick.getByRole('button', { name: '‹ Vorherige' }).click()
  await expect(quick.getByText('Frage 2 von 5')).toBeVisible()
  await expect(quick.getByRole('textbox')).toHaveValue('Einteilung vor Ort nachgeholt')
  await quick.getByRole('button', { name: 'Weiter ›' }).click()

  for (let i = 0; i < 3; i++) await quick.getByRole('button', { name: '✓ Ja' }).click()
  await expect(quick.getByText('Alle Ja/Nein-Fragen erledigt')).toBeVisible()
  await quick.getByRole('button', { name: 'Zurück zum Formular' }).click()

  // The form has the answers
  await expect(page.getByText('Einteilung vor Ort nachgeholt')).toBeVisible()
  await expect(page.getByRole('button', { name: /Schnellmodus/ })).toBeHidden()
})

test('quick mode on a tree: filter questions and a hazard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
  await page.goto(page.url().replace(/job$/, 'tree'))
  await page.getByRole('button', { name: '+ Ersten Baum erfassen' }).click()
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByText('Schritt 5 von 7')).toBeVisible()

  await page.getByRole('button', { name: /Schnellmodus: Karte für Karte/ }).click()
  const quick = page.getByRole('dialog', { name: 'Schnellmodus' })
  await expect(quick.getByText('Gibt es Auffälligkeiten im Baumumfeld?')).toBeVisible()
  await quick.getByRole('button', { name: '✓ Nein, unauffällig' }).click()
  await expect(quick.getByText('Gibt es Auffälligkeiten an Stammfuß oder Stamm?')).toBeVisible()
  await quick.getByRole('button', { name: '! Ja, einzeln prüfen' }).click()
  await expect(quick.getByText('Risse, Wülste, Beulen oder Rippen')).toBeVisible()
  await quick.getByRole('button', { name: '! Vorhanden' }).click()
  await quick
    .getByRole('group', { name: 'Vorschläge zum Antippen' })
    .getByRole('button')
    .first()
    .click()
  await quick.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(quick.getByText('Pilzfruchtkörper am Stamm')).toBeVisible()
  await quick.getByRole('button', { name: 'Beenden' }).click()
  await expect(quick).toBeHidden()
  await expect(page.getByRole('button', { name: /Schnellmodus/ })).toBeVisible()
})
