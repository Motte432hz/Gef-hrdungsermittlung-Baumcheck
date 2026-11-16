import { expect, test } from '@playwright/test'

test('next open point leads across steps; the start page resumes there', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
  await expect(page.getByText(/^Noch \d+ offen$/)).toBeVisible()

  // Step 1 still has open points: the jump stays here
  await page.getByRole('button', { name: 'Nächster offener ›' }).click()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()

  // From the tree assessment (no tree yet) the next open point is in step 6
  const sidebar = page.locator('aside').getByRole('link', { name: /Baumbeurteilung/ })
  if (await sidebar.isVisible()) await sidebar.click()
  else {
    await page.getByRole('button', { name: /Schritt \d+ von 7/ }).click()
    await page
      .locator('#step-menu')
      .getByRole('link', { name: /Baumbeurteilung/ })
      .click()
  }
  await expect(page.getByText('Schritt 5 von 7')).toBeVisible()
  await page.getByRole('button', { name: 'Nächster offener ›' }).click()
  await expect(page.getByText('Schritt 6 von 7')).toBeVisible()
  await expect(page).toHaveURL(/\/workplace#item-/)

  // Back home: the draft resumes at the first open point
  await page.getByRole('link', { name: 'Assistent schließen' }).click()
  const resume = page.getByRole('region', { name: 'Weitermachen' })
  await expect(resume.getByText('Weiter bei „Einsatz“ ›')).toBeVisible()
  await resume.getByRole('link').click()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
})

test('one-time tips disappear and can be shown again', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  const tip = page.getByRole('complementary', { name: 'Tipp' })
  await expect(tip).toContainText('Fachbegriffe antippen')
  await tip.getByRole('button', { name: 'Verstanden' }).click()
  await expect(tip).toBeHidden()
  await page.reload()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
  await expect(tip).toBeHidden()

  await page.goto('/hilfe')
  await page.getByRole('button', { name: /Tipps wieder anzeigen/ }).click()
  await expect(page.getByText('✓ Die Tipps erscheinen wieder im Einsatz.')).toBeVisible()
  await page.goBack()
  await expect(tip).toBeVisible()
})
