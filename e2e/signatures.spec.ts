import { expect, test } from '@playwright/test'
import { drawSignature, fillCompleteAssessment } from './helpers'

test('summary shows all answers; everyone signs; changes invalidate signatures', async ({
  page,
}) => {
  await fillCompleteAssessment(page)

  // No open points left.
  await expect(page.getByText('Noch offen')).toHaveCount(0)
  await expect(page.getByText('Keine Gefahren oder Abweichungen angegeben.')).toBeVisible()

  // Overview: sections with answers and edit links.
  const overview = page.getByRole('region', { name: 'Alle Angaben' })
  await overview.getByText('Baum – Baum 1').click()
  await expect(overview.getByText('Winter-Linde (Tilia cordata)')).toBeVisible()
  await expect(overview.getByText('18 m')).toBeVisible()

  const sigs = page.getByRole('region', { name: 'Unterschriften' })
  await expect(sigs.getByRole('heading')).toHaveText('Unterschriften (0 von 2)')
  await expect(sigs).toContainText('Ort: Lindenstraße 4, 60311 Frankfurt')
  await expect(sigs).toContainText('Auf Grundlage der von mir durchgeführten Gefährdungsermittlung')
  await expect(sigs).toContainText('Ich wurde über die Gefährdungen und Maßnahmen unterwiesen')

  for (const name of ['Anna Ast', 'Bernd Borke']) {
    const card = page.getByRole('listitem', { name: `Unterschrift ${name}` })
    await card.getByRole('button', { name: /Jetzt unterschreiben/ }).click()
    await drawSignature(page, card)
    await card.getByRole('button', { name: 'Unterschrift übernehmen' }).click()
    await expect(card.getByRole('img', { name: `Unterschrift ${name}` })).toBeVisible()
    await expect(card).toContainText('vor Ort unterschrieben')
  }
  await expect(sigs.getByRole('heading')).toHaveText('Unterschriften (2 von 2)')
  await expect(page.getByRole('button', { name: 'Abschließen & PDF erstellen' })).toBeEnabled()

  // Survives reload.
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Unterschriften' }).getByRole('heading'),
  ).toHaveText('Unterschriften (2 von 2)')

  // Change an answer → signatures become outdated.
  const teamSection = page
    .getByRole('region', { name: 'Alle Angaben' })
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: /^Team\d/ }) })
  await teamSection.locator('summary').click()
  await teamSection.getByRole('link', { name: 'Bearbeiten' }).click()
  await expect(page).toHaveURL(/\/team$/)
  const item = page.locator('#item-team-fitForWork')
  await item.getByText('Nein', { exact: true }).click()
  await item.getByLabel('Maßnahme / Begründung').fill('Bernd bleibt am Boden')
  // In-app navigation to the summary (no reload).
  const sidebar = page.locator('aside').getByRole('link', { name: /Prüfen & Abschließen/ })
  if (await sidebar.isVisible()) await sidebar.click()
  else {
    await page.getByRole('button', { name: /Schritt 3 von 9/ }).click()
    await page
      .locator('#step-menu')
      .getByRole('link', { name: /Prüfen & Abschließen/ })
      .click()
  }

  await expect(page.getByRole('region', { name: 'Gefahren und Maßnahmen' })).toContainText(
    'Bernd bleibt am Boden',
  )
  await expect(
    page.getByText(
      '⚠ Die Angaben wurden nach dieser Unterschrift geändert. Bitte erneut unterschreiben.',
    ),
  ).toHaveCount(2)
  await expect(
    page.getByRole('region', { name: 'Unterschriften' }).getByRole('heading'),
  ).toHaveText('Unterschriften (0 von 2)')
})

test('stored profile signature can be used with confirmation by the supervisor', async ({
  page,
}) => {
  // Profile with stored signature.
  await page.goto('/profile/mitarbeiter/neu')
  await page.getByLabel(/^Name/).fill('Carla Zapfen')
  await drawSignature(page)
  await page.getByRole('button', { name: 'Unterschrift übernehmen' }).click()
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()

  await fillCompleteAssessment(page, { newPeople: ['Anna Ast'], profilePeople: ['Carla Zapfen'] })
  // Carla is first → supervisor; Anna signs the instruction statement.
  const card = page.getByRole('listitem', { name: 'Unterschrift Carla Zapfen' })
  await card.getByRole('button', { name: 'Hinterlegte Unterschrift verwenden' }).click()
  const take = card.getByRole('button', { name: 'Übernehmen' })
  await expect(take).toBeDisabled()
  await card.getByText(/Ich \(Carla Zapfen\) bestätige/).click()
  await take.click()
  await expect(card).toContainText(
    'hinterlegte Unterschrift übernommen, bestätigt durch Carla Zapfen',
  )
})

test('signing is blocked while points are open', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page).toHaveURL(/\/job$/)
  await page.goto(page.url().replace(/job$/, 'summary'))
  await expect(
    page.getByText('Unterschreiben ist erst möglich, wenn alle offenen Punkte erledigt sind.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abschließen & PDF erstellen' })).toBeDisabled()
})
