import { expect, test } from '@playwright/test'

test('web app manifest is valid', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const res = await request.get(href!)
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.short_name).toBe('BaumCheck')
  expect(manifest.lang).toBe('de')
  expect(manifest.display).toBe('standalone')
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
})

test('app starts and navigates without network after first visit', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === 'firefox',
    'Playwright cannot emulate offline service workers in Firefox',
  )

  await page.goto('/')
  // Wait until the service worker controls the page and has cached everything.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r))
    }
  })

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Gefährdungsermittlung' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Offline')

  // A deep link that was never visited must also work offline (navigate fallback).
  await page.goto('/einstellungen')
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByRole('status')).toHaveText('Online')
})
