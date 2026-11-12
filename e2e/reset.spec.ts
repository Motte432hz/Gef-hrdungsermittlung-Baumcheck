import { expect, test } from '@playwright/test'

test('the app can be reset with the reset code only', async ({ page }) => {
  // Some data on the device.
  await page.goto('/profile/firma')
  await page.getByLabel('Firmenname').fill('Zwieselwiesel')
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page).toHaveURL(/\/job$/)

  await page.goto('/einstellungen')
  const card = page
    .getByRole('region', { name: 'App zurücksetzen' })
    .or(
      page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: 'App zurücksetzen' }) }),
    )
  // Set the code (twice, must match).
  await card.getByLabel('Reset-Code', { exact: true }).fill('483920')
  await card.getByLabel('Reset-Code wiederholen').fill('483921')
  await card.getByRole('button', { name: 'Reset-Code festlegen' }).click()
  await expect(card.getByText('Die beiden Codes stimmen nicht überein.')).toBeVisible()
  await card.getByLabel('Reset-Code wiederholen').fill('483920')
  await card.getByRole('button', { name: 'Reset-Code festlegen' }).click()

  await card.getByRole('button', { name: 'Dieses Gerät zurücksetzen' }).click()
  await card.getByLabel('Reset-Code', { exact: true }).fill('000000')
  await card.getByText('Mir ist klar, dass alle Daten auf diesem Gerät gelöscht werden.').click()
  await card.getByRole('button', { name: 'Gerät jetzt zurücksetzen' }).click()
  await expect(card.getByText('Falscher Code. Noch 4 Versuche.')).toBeVisible()

  await card.getByLabel('Reset-Code', { exact: true }).fill('483920')
  await card.getByRole('button', { name: 'Gerät jetzt zurücksetzen' }).click()

  // Fresh start: no drafts, no company name, no reset code.
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Noch keine angefangenen Einsätze.')).toBeVisible()
  await page.goto('/profile/firma')
  await expect(page.getByLabel('Firmenname')).toHaveValue('')
  await page.goto('/einstellungen')
  await expect(page.getByRole('button', { name: 'Reset-Code festlegen' })).toBeVisible()
})
