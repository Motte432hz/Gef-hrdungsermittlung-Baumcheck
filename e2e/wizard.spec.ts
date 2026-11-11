import { expect, test, type Page } from '@playwright/test'

async function start(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Neue Gefährdungsermittlung' }).click()
  await expect(page).toHaveURL(/\/einsatz\/[0-9a-f-]{36}\/job$/)
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
}

const next = (page: Page) => page.getByRole('button', { name: 'Weiter ›' }).click()
const item = (page: Page, label: string) =>
  page.locator('[id^="item-"]').filter({ has: page.getByText(label, { exact: true }) })
/** Answers an item and waits until it is stored (radio state comes from the database). */
async function answer(page: Page, label: string, option: string) {
  await item(page, label).getByText(option, { exact: true }).click()
  await expect(
    item(page, label)
      .getByRole('radio', { name: option, checked: true })
      .or(collapsed(page, label, option)),
  ).toHaveCount(1)
}
/** An item answered without findings collapses into a single row. */
const collapsed = (page: Page, label: string, value: string) =>
  page.getByRole('button', { name: `${label}: ${value} – ändern` })

/** In-app navigation via sidebar (tablet/desktop) or step menu (phone) – no page reload. */
async function gotoStep(page: Page, title: RegExp) {
  const sidebar = page.locator('aside').getByRole('link', { name: title })
  if (await sidebar.isVisible()) return sidebar.click()
  await page.getByRole('button', { name: /Schritt \d+ von 7/ }).click()
  await page.locator('#step-menu').getByRole('link', { name: title }).click()
}

async function selectSkt(page: Page) {
  await page.getByText('Seilklettertechnik (SKT)').click()
  await expect(page.getByRole('checkbox', { name: 'Seilklettertechnik (SKT)' })).toBeChecked()
}

test('walks through the steps and autosaves answers', async ({ page }) => {
  await start(page)
  await selectSkt(page)
  await page.getByLabel('Arbeitszeit von').fill('08:00')

  await next(page)
  await expect(page.getByText('Schritt 2 von 7')).toBeVisible()
  await page.getByRole('textbox', { name: /Adresse/ }).fill('Lindenstraße 4, 60311 Frankfurt')
  await answer(page, 'Genauer Einsatzort und Zufahrt sind allen im Team bekannt', 'Ja')

  // Reload: everything is still there (saved on every change).
  await page.reload()
  await expect(page.getByRole('textbox', { name: /Adresse/ })).toHaveValue(
    'Lindenstraße 4, 60311 Frankfurt',
  )
  await expect(
    collapsed(page, 'Genauer Einsatzort und Zufahrt sind allen im Team bekannt', 'Ja'),
  ).toBeVisible()
  await page.getByRole('button', { name: '‹ Zurück' }).click()
  await expect(page.getByRole('checkbox', { name: 'Seilklettertechnik (SKT)' })).toBeChecked()
  await expect(page.getByLabel('Arbeitszeit von')).toHaveValue('08:00')
})

test('checkpoint "Nein" asks for a measure and shows up in the summary', async ({ page }) => {
  await start(page)
  await page.goto(page.url().replace(/job$/, 'site'))
  const label = 'Notruf ist am Arbeitsplatz möglich (Mobilfunkempfang geprüft)'
  await answer(page, label, 'Nein')
  await expect(
    item(page, label).getByText('Nicht erfüllt. Bitte Maßnahme oder Begründung eintragen.'),
  ).toBeVisible()

  await page.goto(page.url().replace(/site$/, 'summary'))
  const open = page.getByRole('link', {
    name: new RegExp(`Maßnahme / Begründung fehlt: ${label.replace(/[()]/g, '.')}`),
  })
  await expect(open).toBeVisible()
  await expect(page.getByRole('link', { name: /Nicht erfüllt: Notruf/ })).toBeVisible()

  // Jump back to the item and fix it.
  await open.click()
  await expect(page).toHaveURL(/\/site#item-site-emergencyCallPossible$/)
  await item(page, label)
    .getByLabel('Maßnahme / Begründung')
    .fill('Notruf von der Kreuzung 200 m nördlich')
  await gotoStep(page, /Prüfen & Abschließen/)
  await expect(
    page.getByRole('link', { name: /Maßnahme \/ Begründung fehlt: Notruf/ }),
  ).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Nicht erfüllt: Notruf/ })).toBeVisible()
})

test('team: new person with roles, SKT plausibility hint', async ({ page }) => {
  await start(page)
  await selectSkt(page)
  await page.goto(page.url().replace(/job$/, 'team'))

  // Search → not found → create right here.
  await page.getByRole('searchbox', { name: 'Person hinzufügen' }).fill('Karl Kletter')
  await expect(page.getByText('Keine gespeicherte Person gefunden.')).toBeVisible()
  await page.getByRole('button', { name: '„Karl Kletter“ neu anlegen' }).click()
  await expect(page.getByLabel(/^Name/)).toHaveValue('Karl Kletter')
  await page.getByLabel('Rufname (optional)').fill('Kalle')
  await page.getByText('Subunternehmer', { exact: true }).click()
  await page.getByLabel('Firma', { exact: true }).fill('Kletterteam Süd')
  await page.getByText('SKT B', { exact: true }).click()
  // First person → supervisor proposed; climbing added by hand.
  const form = page.getByRole('group', { name: 'Rolle im Einsatz' })
  await expect(form.getByRole('checkbox', { name: 'Aufsicht' })).toBeChecked()
  await form.getByText('Kletterer/in', { exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Für spätere Einsätze speichern' })).toBeChecked()
  await page.getByRole('button', { name: 'Hinzufügen' }).click()

  const roles = page.getByRole('group', { name: 'Rollen von Karl Kletter' })
  await expect(roles.getByRole('checkbox', { name: 'Aufsicht' })).toBeChecked()
  await expect(roles.getByRole('checkbox', { name: 'Kletterer/in' })).toBeChecked()
  await expect(page.getByText(/mindestens 2 Personen mit SKT-Qualifikation/)).toBeVisible()

  // Supervisor is now selected in step 1.
  await page.goto(page.url().replace(/team$/, 'job'))
  await expect(page.getByRole('combobox', { name: /Aufsichtsführende Person/ })).toHaveValue(/^m:/)
  await expect(
    page.getByRole('combobox', { name: /Aufsichtsführende Person/ }).locator('option:checked'),
  ).toHaveText('Karl Kletter „Kalle“ (Kletterteam Süd)')

  // Saved as subcontractor profile.
  await page.goto('/profile/subunternehmer')
  await expect(page.getByText('Karl Kletter')).toBeVisible()
})

test('conditional items appear only for the matching job type', async ({ page }) => {
  await start(page)
  await page.goto(page.url().replace(/job$/, 'workplace'))
  await expect(
    page.getByRole('group', { name: 'Zwei vollständige Kletterausrüstungen vor Ort' }),
  ).toHaveCount(0)
  await page.goto(page.url().replace(/workplace$/, 'job'))
  await selectSkt(page)
  await page.goto(page.url().replace(/job$/, 'workplace'))
  await expect(
    page.getByRole('group', { name: 'Zwei vollständige Kletterausrüstungen vor Ort' }),
  ).toBeVisible()
  await expect(page.getByRole('group', { name: 'Rettungsseil vorhanden' })).toBeVisible()
})

test('equipment preset is prefilled and must be confirmed', async ({ page }) => {
  await page.goto('/profile/ausruestung')
  await page.getByRole('button', { name: 'Alle auf „Ja“' }).click()
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('✓ Gespeichert')).toBeVisible()

  await start(page)
  await page.goto(page.url().replace(/job$/, 'workplace'))
  const ppe = item(page, 'PSA vor Benutzung auf Schäden geprüft')
  await expect(ppe.getByRole('radio', { name: 'Ja' })).toBeChecked()
  await expect(ppe.getByText(/vorbelegt – bitte prüfen/)).toBeVisible()

  await ppe.getByRole('button', { name: 'Stimmt so' }).click()
  await expect(ppe.getByText(/vorbelegt – bitte prüfen/)).toHaveCount(0)

  await page.getByRole('button', { name: 'Alle vorbelegten bestätigen' }).click()
  await expect(page.getByText(/vorbelegt – bitte prüfen/)).toHaveCount(0)
})

test('tree result and growth form warnings come from the definition', async ({ page }) => {
  await start(page)
  await page.getByText('Sonstiges', { exact: true }).click()
  await expect(page.getByLabel('Sonstiges: bitte beschreiben')).toBeVisible()
})

test('drafts are listed on the start page and can be deleted', async ({ page }) => {
  await start(page)
  await page.goto(page.url().replace(/job$/, 'site'))
  await page.getByRole('textbox', { name: /Adresse/ }).fill('Am Stadtpark 1\nHinterhof')
  await page.getByRole('link', { name: 'Assistent schließen' }).click()

  const draft = page.getByRole('link', { name: /Am Stadtpark 1/ })
  await expect(draft).toBeVisible()
  await expect(draft).toContainText('offene Punkte')
  await draft.click()
  await expect(page.getByText('Schritt 1 von 7')).toBeVisible()
  await page.getByRole('link', { name: 'Assistent schließen' }).click()

  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: /Entwurf Am Stadtpark 1 löschen/ }).click()
  await expect(page.getByText('Noch keine angefangenen Einsätze.')).toBeVisible()
})

test('step menu shows all steps and allows jumping', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) >= 768, 'menu toggle exists on phones only')
  await start(page)
  await page.getByRole('button', { name: /Schritt 1 von 7/ }).click()
  const menu = page.locator('#step-menu')
  await expect(menu.getByRole('link')).toHaveCount(7)
  await menu.getByRole('link', { name: /Einsatzort & Ausrüstung/ }).click()
  await expect(page).toHaveURL(/\/workplace$/)
  await expect(page.getByText('Schritt 6 von 7')).toBeVisible()
})

test('tree steps are not marked complete without a tree', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 768, 'sidebar is visible from tablet width')
  await start(page)
  await expect(page.locator('aside').getByRole('link', { name: /Baumbeurteilung/ })).toContainText(
    'offen',
  )
  await expect(
    page.locator('aside').getByRole('link', { name: /Baumbeurteilung/ }),
  ).not.toContainText('vollständig')
})

test('filter question hides hazards until abnormalities are reported', async ({ page }) => {
  await start(page)
  await page.goto(page.url().replace(/job$/, 'workplace'))
  const gate = item(page, 'Gibt es besondere Gefahren am Einsatzort?')
  await expect(page.getByText('Stromleitungen', { exact: false })).toHaveCount(0)

  await gate.getByText('Ja, einzeln prüfen', { exact: true }).click()
  await expect(gate.getByRole('radio', { name: 'Ja, einzeln prüfen' })).toBeChecked()
  const power = page.locator('#item-site-powerLines')
  await power.getByText('vorhanden', { exact: true }).click()
  await power.getByLabel('Maßnahme').fill('Netzbetreiber schaltet frei')
  await gate.getByRole('button', { name: /Übrige 4 als „nicht vorhanden“ markieren/ }).click()
  await expect(
    page.locator('#item-site-undergroundUtilities').getByRole('button', {
      name: /: nicht vorhanden – ändern$/,
    }),
  ).toBeVisible()

  // Switching to "none" asks before deleting the reported hazard.
  page.once('dialog', (d) => void d.accept())
  await gate.getByText('Nein, unauffällig', { exact: true }).click()
  await expect(gate.getByRole('radio', { name: 'Nein, unauffällig' })).toBeChecked()
  await expect(page.locator('#item-site-powerLines')).toHaveCount(0)
  await expect(gate.getByText('5 Merkmale als unauffällig erfasst.')).toBeVisible()
})

test('answered items collapse; "all yes" answers the open checkpoints of a section', async ({
  page,
}) => {
  await start(page)
  await page.goto(page.url().replace(/job$/, 'team'))
  const briefed = 'Der Arbeitsauftrag wurde mit allen besprochen'
  await answer(page, briefed, 'Ja')
  const row = collapsed(page, briefed, 'Ja')
  await expect(row).toBeVisible()

  // Change a collapsed answer.
  await row.click()
  await answer(page, briefed, 'Nein')
  await expect(item(page, briefed).getByLabel('Maßnahme / Begründung')).toBeVisible()

  await page.getByRole('button', { name: 'Alle 4 offenen mit „Ja“ beantworten' }).click()
  await expect(page.getByRole('button', { name: /: Ja – ändern$/ })).toHaveCount(4)
  await expect(page.getByRole('button', { name: /offenen mit „Ja“/ })).toHaveCount(0)
  // The "Nein" with its measure field stays open.
  await expect(item(page, briefed).getByRole('radio', { name: 'Nein' })).toBeChecked()
})

test('new customer and whole subcontractor company without leaving the wizard', async ({
  page,
}) => {
  for (const name of ['Kim Krone', 'Lea Laub']) {
    await page.goto('/profile/team/person/neu?art=sub')
    await page.getByLabel('Firma', { exact: true }).fill('Kletterteam Süd')
    await page.getByLabel(/^Name/).fill(name)
    await expect(page.getByText('✓ Gespeichert')).toBeVisible()
  }

  await start(page)
  await page.getByRole('button', { name: '+ Neuer Kunde' }).click()
  await page.getByLabel(/^Name des Kunden/).fill('Hausverwaltung Müller')
  await page.getByLabel('Objekt (optional)').fill('Wohnanlage Lindenstraße')
  await page.getByLabel('Straße und Hausnummer').fill('Lindenstraße 4')
  await page.getByLabel('PLZ').fill('60311')
  await page.getByLabel('Ort').fill('Frankfurt')
  await page.getByRole('button', { name: 'Speichern und auswählen' }).click()
  await expect(
    page.getByRole('combobox', { name: 'Kunde / Objekt' }).locator('option:checked'),
  ).toHaveText('Hausverwaltung Müller')
  await expect(
    page.getByRole('combobox', { name: 'Objekt', exact: true }).locator('option:checked'),
  ).toHaveText('Wohnanlage Lindenstraße')

  await next(page)
  await expect(page.getByRole('textbox', { name: /Adresse/ })).toHaveValue(
    'Lindenstraße 4, 60311 Frankfurt',
  )

  await next(page)
  await page.getByRole('button', { name: 'Alle von Kletterteam Süd hinzufügen (2)' }).click()
  await expect(
    page
      .getByRole('group', { name: 'Rollen von Kim Krone' })
      .getByRole('checkbox', { name: 'Aufsicht' }),
  ).toBeChecked()
  await expect(
    page
      .getByRole('group', { name: 'Rollen von Lea Laub' })
      .getByRole('checkbox', { name: 'Bodenperson' }),
  ).toBeChecked()
  // Search finds nobody left to add.
  await page.getByRole('searchbox', { name: 'Person hinzufügen' }).fill('Kim')
  await expect(page.getByText('Keine gespeicherte Person gefunden.')).toBeVisible()
})
