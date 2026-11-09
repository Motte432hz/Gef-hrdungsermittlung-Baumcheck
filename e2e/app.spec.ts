import { expect, test } from '@playwright/test'

test('start page loads with navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Gefährdungsermittlung' })).toBeVisible()
  await expect(page.getByRole('status', { name: /Verbindung/ })).toHaveText('Online')

  // Exactly one navigation is visible: bottom bar on phones, sidebar on tablet/desktop.
  const navs = page.getByRole('navigation', { name: 'Hauptnavigation' })
  await expect(navs.filter({ visible: true })).toHaveCount(1)

  await navs.filter({ visible: true }).getByRole('link', { name: 'Archiv' }).click()
  await expect(page).toHaveURL(/\/archiv$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Archiv' })).toBeVisible()
})

test('no horizontal scrolling', async ({ page }) => {
  for (const path of ['/', '/archiv', '/profile', '/einstellungen']) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0)
  }
})

test('touch targets in navigation are at least 48px high', async ({ page }) => {
  await page.goto('/')
  const links = page
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .filter({ visible: true })
    .getByRole('link')
  for (const link of await links.all()) {
    const box = await link.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(48)
  }
})

test('dark mode can be selected and survives reload', async ({ page }) => {
  await page.goto('/einstellungen')
  await page.getByText('Dunkel', { exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('deep link to a sub page works', async ({ page }) => {
  await page.goto('/profile')
  await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()
})
