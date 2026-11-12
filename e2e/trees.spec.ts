import { expect, test, type Page } from '@playwright/test'

async function start(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page).toHaveURL(/\/job$/)
  return page.url().replace(/job$/, '')
}

async function check(page: Page, label: string) {
  await page.getByText(label, { exact: true }).click()
  await expect(page.getByRole('checkbox', { name: label, exact: true })).toBeChecked()
}

async function addFirstTree(page: Page, base: string) {
  await page.goto(base + 'tree')
  await page.getByRole('button', { name: '+ Ersten Baum erfassen' }).click()
  await expect(page).toHaveURL(/\/tree\?baum=/)
}

async function pickSpecies(page: Page, query: string, name: string) {
  await page.getByRole('combobox').fill(query)
  await page
    .getByRole('option', { name: new RegExp(name) })
    .first()
    .click()
  await expect(page.getByRole('button', { name: 'Ändern' })).toBeVisible()
}

test('species search shows typical hazards with advice for the planned work', async ({ page }) => {
  const base = await start(page)
  await check(page, 'Seilklettertechnik (SKT)')
  await check(page, 'Kroneneinkürzung')
  await addFirstTree(page, base)

  await pickSpecies(page, 'bergahorn', 'Berg-Ahorn')
  await expect(page.getByText('Acer pseudoplatanus')).toBeVisible()
  const panel = page.getByRole('region', { name: 'Typische Gefahren: Berg-Ahorn' })
  await expect(panel.getByText('Rußrindenkrankheit', { exact: true })).toBeVisible()
  await expect(panel.getByText(/Atemschutz mindestens FFP2/)).toBeVisible()
  await expect(panel.getByText('Beim Klettern:')).toBeVisible()
  await expect(panel.getByText('Beim Hacken:')).toBeVisible()
  // No felling planned → no felling advice.
  await expect(panel.getByText('Bei der Fällung:')).toHaveCount(0)

  // Tree tab shows the species.
  await expect(page.getByRole('navigation', { name: 'Bäume' })).toContainText('Baum 1 · Berg-Ahorn')

  // Compact reminder on the assessment step.
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page).toHaveURL(/\/treeAssessment\?baum=/)
  const compact = page.getByRole('region', { name: 'Typische Gefahren: Berg-Ahorn' })
  await expect(compact).toContainText('Rußrindenkrankheit · Honigtau')
  await expect(compact.getByText(/Atemschutz mindestens FFP2/)).toHaveCount(0)
  await compact.getByRole('button', { name: /Anzeigen/ }).click()
  await expect(compact.getByText(/Atemschutz mindestens FFP2/)).toBeVisible()
})

test('felling plan shows felling advice (ash)', async ({ page }) => {
  const base = await start(page)
  await check(page, 'Fällung')
  await addFirstTree(page, base)
  await pickSpecies(page, 'Fraxinus excelsior', 'Gemeine Esche')
  const panel = page.getByRole('region', { name: 'Typische Gefahren: Gemeine Esche' })
  await expect(panel.getByText('Aufreißgefahr beim Fällen')).toBeVisible()
  await expect(panel.getByText('Bei der Fällung:').first()).toBeVisible()
})

test('species not in the list can be entered as free text', async ({ page }) => {
  const base = await start(page)
  await addFirstTree(page, base)
  await page.getByRole('combobox').fill('Mispel')
  await page.getByRole('option', { name: /„Mispel“ als andere Baumart/ }).click()
  await expect(page.getByText('Andere Baumart (nicht in der Liste)')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Bäume' })).toContainText('Baum 1 · Mispel')
})

test('photos can be added and deleted', async ({ page }) => {
  const base = await start(page)
  await addFirstTree(page, base)
  await page
    .locator('input[type=file][multiple]')
    .setInputFiles(['public/pwa-512x512.png', 'public/pwa-192x192.png'])
  const photos = page.getByRole('list', { name: 'Fotos' }).getByRole('img')
  await expect(photos).toHaveCount(2)
  expect(
    await photos.first().evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0)

  await page.reload()
  await expect(page.getByRole('list', { name: 'Fotos' }).getByRole('img')).toHaveCount(2)
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Foto 1 löschen' }).click()
  await expect(page.getByRole('list', { name: 'Fotos' }).getByRole('img')).toHaveCount(1)
})

test('photos can be marked with arrows and circles; the original is kept', async ({ page }) => {
  const base = await start(page)
  await addFirstTree(page, base)
  await page.locator('input[type=file][multiple]').setInputFiles(['public/pwa-512x512.png'])
  const list = page.getByRole('list', { name: 'Fotos' })
  await expect(list.getByRole('img')).toHaveCount(1)
  const before = await list.getByRole('img').first().getAttribute('src')

  await page.getByRole('button', { name: 'Foto 1 markieren' }).click()
  const editor = page.getByRole('dialog', { name: 'Foto 1 markieren' })
  const canvas = editor.getByRole('img', { name: 'Foto zum Markieren' })
  await expect(editor.getByRole('button', { name: 'Fertig' })).toBeEnabled()
  const box = (await canvas.boundingBox())!
  // Arrow (default tool), then a circle.
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 5 })
  await page.mouse.up()
  await editor.getByRole('button', { name: /Kreis/ }).click()
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, { steps: 5 })
  await page.mouse.up()
  await editor.getByRole('button', { name: /Rückgängig/ }).click()
  await editor.getByRole('button', { name: 'Markierungen speichern' }).click()
  await expect(editor).toHaveCount(0)
  await expect(list.getByText('markiert')).toBeVisible()
  await expect.poll(() => list.getByRole('img').first().getAttribute('src')).not.toBe(before)

  // Back to the original.
  await page.getByRole('button', { name: 'Foto 1 markieren' }).click()
  await editor.getByRole('button', { name: 'Original wiederherstellen' }).click()
  await expect(list.getByText('markiert')).toHaveCount(0)
})

test('several trees: next walks tree by tree; trees can be removed', async ({ page }) => {
  const base = await start(page)
  await addFirstTree(page, base)
  await pickSpecies(page, 'Linde', 'Winter-Linde')
  await page.getByRole('button', { name: '+ Baum' }).click()
  await expect(page.getByRole('heading', { name: 'Baum 2' })).toBeVisible()
  await pickSpecies(page, 'Platane', 'Ahornblättrige Platane')

  await page
    .getByRole('navigation', { name: 'Bäume' })
    .getByRole('button', { name: /Baum 1/ })
    .click()
  await expect(page.getByRole('heading', { name: 'Baum 1 · Winter-Linde' })).toBeVisible()

  const next = page.getByRole('button', { name: 'Weiter ›' })
  await next.click()
  await expect(page.getByText('Schritt 5 von 7')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Baum 1 · Winter-Linde' })).toBeVisible()
  await next.click()
  await expect(page.getByText('Schritt 4 von 7')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Baum 2 · Ahornblättrige Platane' })).toBeVisible()
  await next.click()
  await expect(page.getByRole('heading', { name: 'Baum 2 · Ahornblättrige Platane' })).toBeVisible()
  await expect(page.getByText('Schritt 5 von 7')).toBeVisible()
  await next.click()
  await expect(page.getByText('Schritt 6 von 7')).toBeVisible()

  await page.goto(base + 'tree')
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Baum 1 · Winter-Linde entfernen' }).click()
  await expect(
    page.getByRole('navigation', { name: 'Bäume' }).getByRole('button', { name: /^Baum/ }),
  ).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Baum 1 · Ahornblättrige Platane' })).toBeVisible()
})

test('tree result "Nein" is a danger and jumps from the summary to the right tree', async ({
  page,
}) => {
  const base = await start(page)
  await addFirstTree(page, base)
  await page.getByRole('button', { name: '+ Baum' }).click()
  await expect(page.getByRole('heading', { name: 'Baum 2' })).toBeVisible()
  const tree2 = new URL(page.url()).searchParams.get('baum')!

  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByText('Schritt 5 von 7')).toBeVisible()
  const result = page.locator('[id$="tree-result"]')
  await result.getByText('Nein', { exact: true }).click()
  await expect(
    result.getByText(/darf mit dem geplanten Verfahren nicht bearbeitet werden/),
  ).toBeVisible()
  await expect(result.getByLabel('Begründung / geändertes Vorgehen')).toBeVisible()

  await page.goto(base + 'summary')
  const link = page.getByRole('link', { name: /Baum 2.*Begründung \/ geändertes Vorgehen fehlt/ })
  await expect(link).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Baum 2.*darf mit dem geplanten Verfahren/ }),
  ).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(
    new RegExp(`/treeAssessment\\?baum=${tree2}#item-${tree2}-tree-result$`),
  )
  await expect(page.getByRole('heading', { name: 'Baum 2' })).toBeVisible()
})

test.describe('camera', () => {
  // Firefox in Playwright does not know the camera permission; the fake camera is Chromium-only.
  test.skip(({ browserName }) => browserName !== 'chromium', 'camera emulation needs Chromium')
  test.use({ permissions: ['camera'] })

  test('laptop: in-app camera takes photos', async ({ page, isMobile }) => {
    test.skip(isMobile, 'phones use the native camera app (next test)')
    const base = await start(page)
    await addFirstTree(page, base)
    // Desktop browsers get the in-app camera instead of a file dialog.
    await expect(page.getByText('🖼 Datei auswählen')).toBeVisible()
    await page.getByRole('button', { name: /Foto aufnehmen/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Kamera' })
    const shutter = dialog.getByRole('button', { name: 'Foto aufnehmen' })
    await expect(shutter).toBeEnabled()
    await shutter.click()
    await expect(dialog.getByRole('button', { name: 'Fertig (1)' })).toBeVisible()
    await shutter.click()
    await dialog.getByRole('button', { name: 'Fertig (2)' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('list', { name: 'Fotos' }).getByRole('img')).toHaveCount(2)
  })

  test('phones use the native camera app', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
      viewport: { width: 412, height: 900 },
      hasTouch: true,
    })
    const page = await context.newPage()
    const base = await start(page)
    await addFirstTree(page, base)
    await expect(page.locator('input[type=file][capture="environment"]')).toHaveCount(1)
    await expect(page.getByText('🖼 Aus Galerie')).toBeVisible()
    await context.close()
  })
})

test('another tree like tree 1: basics copied, assessment must be confirmed', async ({ page }) => {
  const base = await start(page)
  await addFirstTree(page, base)
  await pickSpecies(page, 'Winter-Linde', 'Winter-Linde')
  await page.getByRole('textbox', { name: /Baumhöhe/ }).fill('18')
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByText('Schritt 5 von 7')).toBeVisible()
  await page.getByText('Stufe 1 – Degeneration (leicht geschwächt)', { exact: true }).click()
  const env = page.locator('[id$="tree-env-gate"]')
  await env.getByText('Nein, unauffällig', { exact: true }).click()
  await expect(env.getByRole('radio', { name: 'Nein, unauffällig' })).toBeChecked()

  await page.getByRole('button', { name: '+ Weiterer Baum wie Baum 1' }).click()
  await expect(page).toHaveURL(/\/tree\?baum=/)
  await expect(page.getByRole('heading', { name: 'Baum 2 · Winter-Linde' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Baumhöhe/ })).toHaveValue('18')

  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByRole('heading', { name: 'Baum 2 · Winter-Linde' })).toBeVisible()
  await expect(
    page.getByText('2 Angaben wurden von Baum 1 übernommen.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByText('Von Baum 1 übernommen – bitte prüfen')).toHaveCount(2)
  await page.getByRole('button', { name: 'Alle übernommenen bestätigen' }).click()
  await expect(page.getByText(/von Baum 1 übernommen/i)).toHaveCount(0)
  await expect(
    page.getByRole('radio', { name: 'Stufe 1 – Degeneration (leicht geschwächt)' }),
  ).toBeChecked()
})

test('conifers get the needle scale instead of the Roloff scale', async ({ page }) => {
  const base = await start(page)
  await addFirstTree(page, base)
  await pickSpecies(page, 'Fichte', 'Gemeine Fichte')
  await page.getByRole('button', { name: 'Weiter ›' }).click()
  await expect(page.getByText('Benadelung der Krone (Nadelbäume)')).toBeVisible()
  await expect(page.getByText('Vitalität der Krone (Roloff, Laubbäume)')).toHaveCount(0)
  await page.getByText('Stufe 3 – stark verlichtet (über 60 %)', { exact: true }).click()
  await expect(page.getByText(/hohe Bruchgefahr, besonders im Wipfel/)).toBeVisible()
})
