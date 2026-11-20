import { expect, test, type Page } from '@playwright/test'
import { drawSignature, fillCompleteAssessment } from './helpers'

async function start(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
}

test('emergency button shows the emergency info from every step', async ({ page }) => {
  await start(page)
  await page.goto(page.url().replace(/job$/, 'site'))
  await page.getByRole('textbox', { name: /Adresse/ }).fill('Lindenstraße 4, Frankfurt')
  await page.getByRole('textbox', { name: /Zufahrt/ }).fill('Hofeinfahrt')
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByText('Schritt 3 von 7')).toBeVisible()
  await page.getByRole('button', { name: 'Notfall' }).click()
  const sheet = page.getByRole('dialog', { name: 'Notfall' })
  await expect(sheet.getByText(/Lindenstraße 4, Frankfurt/)).toBeVisible()
  await expect(sheet.getByRole('link', { name: /112 anrufen/ })).toHaveAttribute('href', 'tel:112')
})

test('undo after answering a section with "Ja"', async ({ page }) => {
  await start(page)
  await page.goto(page.url().replace(/job$/, 'team'))
  const all = page.getByRole('button', { name: /offenen mit „Ja“ beantworten/ })
  await all.click()
  await expect(page.getByText(/Punkte mit „Ja“ beantwortet/)).toBeVisible()
  await expect(all).toBeHidden()
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(all).toBeVisible()
})

test('sun mode from the step menu', async ({ page }) => {
  await start(page)
  const sidebar = page.locator('aside').first()
  if (!(await sidebar.isVisible()))
    await page.getByRole('button', { name: /Schritt 1 von 7/ }).click()
  await page.getByText('☀️ Sonnenmodus').filter({ visible: true }).click()
  await expect(page.locator('html')).toHaveClass(/sun/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/sun/)
})

test('swiping goes to the next step', async ({ page, hasTouch }) => {
  test.skip(!hasTouch, 'touch only')
  await start(page)
  await page.locator('main').evaluate((main) => {
    const touch = (x: number) =>
      new Touch({ identifier: 1, target: main, clientX: x, clientY: 300 })
    main.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        touches: [touch(300)],
        changedTouches: [touch(300)],
      }),
    )
    main.dispatchEvent(
      new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [touch(120)] }),
    )
  })
  await expect(page.getByText('Schritt 2 von 7')).toBeVisible()
})

test('everyone signs one after the other', async ({ page }) => {
  await fillCompleteAssessment(page)
  await page.getByRole('button', { name: '✍ Alle nacheinander unterschreiben' }).click()
  const dialog = page.getByRole('dialog', { name: 'Unterschreiben' })
  for (const name of ['Anna Ast', 'Bernd Borke']) {
    await dialog.getByRole('button', { name: `Ich bin ${name} – weiter` }).click()
    await drawSignature(page, dialog)
    await dialog.getByRole('button', { name: 'Unterschrift übernehmen' }).click()
  }
  await expect(dialog.getByText('Alle haben unterschrieben')).toBeVisible()
  await dialog.getByRole('button', { name: 'Zurück zur Übersicht' }).click()
  await expect(page.getByText('Unterschriften (2 von 2)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abschließen & PDF erstellen' })).toBeEnabled()
})
