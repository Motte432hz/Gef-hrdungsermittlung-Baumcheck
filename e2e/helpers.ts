import { expect, type Page } from '@playwright/test'

/** Next step; waits until the new step is shown. */
export async function next(page: Page) {
  const before = await page.getByText(/^Schritt \d+ von 9$/).textContent()
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByText(/^Schritt \d+ von 9$/)).not.toHaveText(before!)
}

export async function drawSignature(page: Page, scope = page.locator('body')) {
  const canvas = scope.getByRole('img', { name: /Unterschriftenfeld/ })
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 20, box.y + box.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + 20 + i * 20, box.y + box.height / 2 + (i % 2 ? -25 : 25))
  }
  await page.mouse.up()
}

/** Clicks every unchecked radio with this exact label text and waits until all are stored. */
async function answerAll(page: Page, text: string) {
  const labels = page.locator('main label').filter({ hasText: new RegExp(`^${text}$`) })
  await expect(labels.first()).toBeVisible()
  const n = await labels.count()
  for (let i = 0; i < n; i++) await labels.nth(i).click()
  const radios = page.locator('main').getByRole('radio', { name: text, exact: true })
  for (let i = 0; i < n; i++) await expect(radios.nth(i)).toBeChecked()
}

async function check(page: Page, label: string) {
  await page.getByText(label, { exact: true }).click()
  await expect(page.getByRole('checkbox', { name: label, exact: true })).toBeChecked()
}

async function addPerson(page: Page, name: string, role: string) {
  await page.getByRole('button', { name: /Neue Person/ }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Hinzufügen' }).click()
  const roles = page.getByRole('group', { name: `Rollen von ${name}` })
  await roles.getByText(role, { exact: true }).click()
  await expect(roles.getByRole('checkbox', { name: role })).toBeChecked()
}

/**
 * Fills a complete assessment through the UI (no warnings) and ends on the summary step.
 * The team gets `people` (first one is the supervisor); profile people are picked by name.
 */
export async function fillCompleteAssessment(
  page: Page,
  opts: { newPeople?: string[]; profilePeople?: string[] } = {},
) {
  const newPeople = opts.newPeople ?? ['Anna Ast', 'Bernd Borke']
  const profilePeople = opts.profilePeople ?? []
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page).toHaveURL(/\/job$/)

  await check(page, 'Baumarbeiten (allgemein)')
  await next(page)

  await page.getByRole('textbox', { name: /Adresse/ }).fill('Lindenstraße 4, 60311 Frankfurt')
  await page.getByRole('textbox', { name: /Zufahrt/ }).fill('Einfahrt Hofseite')
  await answerAll(page, 'Ja')
  await next(page)

  // Team: profile people first, then new ones; the first person supervises.
  const all = [...profilePeople, ...newPeople]
  for (const name of profilePeople) {
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  }
  for (const name of newPeople)
    await addPerson(page, name, name === all[0] ? 'Aufsicht' : 'Bodenperson')
  for (const name of profilePeople) {
    const roles = page.getByRole('group', { name: `Rollen von ${name}` })
    const role = name === all[0] ? 'Aufsicht' : 'Bodenperson'
    await roles.getByText(role, { exact: true }).click()
    await expect(roles.getByRole('checkbox', { name: role })).toBeChecked()
  }
  await answerAll(page, 'Ja')
  await next(page)

  await check(page, 'Totholzentnahme')
  await next(page)

  await page.getByRole('button', { name: '+ Ersten Baum erfassen' }).click()
  await page.getByRole('combobox').fill('Winter-Linde')
  await page.getByRole('option', { name: 'Winter-Linde Tilia cordata' }).click()
  await page.getByRole('textbox', { name: /Baumhöhe/ }).fill('18')
  await page.getByRole('textbox', { name: /Stammdurchmesser/ }).fill('45')
  const growth = page.locator('[id$="tree-growthForm"]')
  await growth.getByText('Normalbaum', { exact: true }).click()
  await expect(growth.getByRole('radio').first()).toBeChecked()
  await next(page)

  await answerAll(page, 'nicht vorhanden')
  await answerAll(page, 'Gleichmäßig')
  const result = page.locator('[id$="tree-result"]')
  await result.getByText('Ja', { exact: true }).click()
  await expect(result.getByRole('radio').first()).toBeChecked()
  await next(page)

  await answerAll(page, 'Ja')
  await answerAll(page, 'nicht vorhanden')
  await next(page)

  await answerAll(page, 'Ja')
  await next(page)
  await expect(page.getByText('Schritt 9 von 9')).toBeVisible()
}

/** Signs for every person on the summary step. */
export async function signEveryone(page: Page) {
  const cards = page.getByRole('listitem', { name: /^Unterschrift / })
  const n = await cards.count()
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i)
    await card.getByRole('button', { name: /Jetzt unterschreiben/ }).click()
    await drawSignature(page, card)
    await card.getByRole('button', { name: 'Unterschrift übernehmen' }).click()
    await expect(card.getByRole('button', { name: 'Neu unterschreiben' })).toBeVisible()
  }
}

/** Waits until the service worker controls the page (needed before going offline). */
export async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r))
    }
  })
}
