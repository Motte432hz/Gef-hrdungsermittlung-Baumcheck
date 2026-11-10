// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { buildProtocolPdf, type ProtocolPdfInput } from './protocolPdf'
import { currentDefinition as def } from '../form/definition'
import { member, validInput } from '../test/fixtures'
import type { Assessment, Organization, Signature } from '../domain/types'
import { sanitize } from './writer'

const fonts = {
  regular: readFileSync('public/fonts/DejaVuSans.ttf'),
  bold: readFileSync('public/fonts/DejaVuSans-Bold.ttf'),
}
const png = readFileSync('public/pwa-192x192.png')
const buf = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer

function input(over: (i: ProtocolPdfInput) => void = () => {}): ProtocolPdfInput {
  const v = validInput(def)
  const sup = member({
    id: 'm1',
    name: 'Anna Äst',
    nickname: 'Änni',
    roles: ['supervisor'],
    gear: [
      {
        id: 'g1',
        name: 'SpiderJack 3',
        category: 'friction',
        serialNumber: 'SJ-123',
        nextInspection: '2027-03-31',
      },
    ],
  })
  const ground = member({
    id: 'm2',
    name: 'Bernd Borke',
    company: 'Kletterteam Süd',
    roles: ['ground'],
  })
  const assessment: Assessment = {
    id: 'a1',
    organizationId: 'o1',
    createdAt: '',
    updatedAt: '',
    syncState: 'pending',
    status: 'draft',
    formVersion: '1.0',
    version: 1,
    ...v.assessment,
    team: [sup, ground],
    supervisorMemberId: 'm1',
  }
  assessment.answers['site.address'] = { value: 'Lindenstraße 4, 60311 Frankfurt' }
  assessment.answers['site.powerLines'] = {
    value: 'present',
    note: 'Netzbetreiber schaltet frei (Maßnahme ü)',
  }
  const org: Organization = {
    id: 'o1',
    organizationId: 'o1',
    createdAt: '',
    updatedAt: '',
    syncState: 'pending',
    name: 'Zwieselwiesel Baumpflege',
    numberPrefix: 'ZW',
    reportEmails: [],
    city: 'Frankfurt',
    logo: { type: 'image/png', data: buf(png) },
  }
  const sig = (memberId: string, statement: Signature['statement']): Signature => ({
    id: `s-${memberId}`,
    organizationId: 'o1',
    createdAt: '',
    updatedAt: '',
    syncState: 'pending',
    assessmentId: 'a1',
    memberId,
    name: '',
    roles: [],
    statement,
    method: 'drawn',
    image: { type: 'image/png', data: buf(png) },
    signedAt: '2026-11-09T08:15:00Z',
    contentHash: 'abc',
  })
  const trees = v.trees.map((t) => ({
    ...t,
    organizationId: 'o1',
    createdAt: '',
    updatedAt: '',
    syncState: 'pending' as const,
    assessmentId: 'a1',
    answers: { ...t.answers, 'tree.species': { value: 'acer-pseudoplatanus' } },
  }))
  const i: ProtocolPdfInput = {
    definition: def,
    organization: org,
    assessment,
    protocolNumber: 'ZW-2026-0042',
    completedAt: '2026-11-09T09:00:00Z',
    trees,
    signatures: [sig('m1', 'supervisor'), sig('m2', 'member')],
    photos: [{ treeId: 't1', file: { type: 'image/png', data: buf(png) } }],
    contentHash: 'abc0123456789def'.padEnd(64, '0'),
  }
  over(i)
  return i
}

async function pdfText(bytes: Uint8Array): Promise<string[]> {
  const doc = await getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
  }).promise
  const pages: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    pages.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '))
  }
  return pages
}

describe('protocol PDF', () => {
  it('creates a valid A4 PDF with metadata', async () => {
    const bytes = await buildProtocolPdf(input(), fonts)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3)
    const { width, height } = doc.getPage(0).getSize()
    expect(Math.round(width)).toBe(595)
    expect(Math.round(height)).toBe(842)
    expect(doc.getTitle()).toContain('ZW-2026-0042')
    expect(doc.getAuthor()).toBe('Zwieselwiesel Baumpflege')
    // Subset fonts keep it small despite photos and two fonts.
    expect(bytes.byteLength).toBeLessThan(400_000)
  })

  it('contains header, umlauts, hazards with measures, signatures and footer', async () => {
    const pages = await pdfText(await buildProtocolPdf(input(), fonts))
    const all = pages.join('\n')
    expect(pages[0]).toContain('Zwieselwiesel Baumpflege')
    expect(pages[0]).toContain('Einsatzbezogene Gefährdungsermittlung / Baumsicherheitsbeurteilung')
    expect(pages[0]).toContain('Protokoll-Nr. ZW-2026-0042')
    expect(all).toContain('Lindenstraße 4, 60311 Frankfurt')
    expect(all).toContain('Gefahren und Maßnahmen')
    expect(all).toContain('VORHANDEN')
    expect(all).toContain('Netzbetreiber schaltet frei (Maßnahme ü)')
    expect(all).toContain('Berg-Ahorn (Acer pseudoplatanus)')
    expect(all).toContain('Rußrindenkrankheit')
    expect(all).toContain('Auf Grundlage der von mir durchgeführten Gefährdungsermittlung')
    expect(all).toContain('Anna Äst „Änni“')
    expect(all).toContain('Persönliche Schutzausrüstung (laut Profil)')
    expect(all).toContain('SpiderJack 3 (Nr. SJ-123, nächste Prüfung 31.03.2027)')
    expect(all).toContain('Bernd Borke (Kletterteam Süd)')
    expect(all).toContain('vor Ort unterschrieben')
    expect(all).toContain('Anlage: Fotos')
    pages.forEach((p, i) => {
      expect(p).toContain(`Seite ${i + 1} von ${pages.length}`)
      expect(p).toContain('Protokoll ZW-2026-0042')
      expect(p).toContain('Prüfwert abc0 1234 5678 9def')
      expect(p).toContain('erstellt mit BaumCheck')
    })
  })

  it('missing signatures are clearly marked', async () => {
    const pages = await pdfText(
      await buildProtocolPdf(
        input((i) => (i.signatures = [])),
        fonts,
      ),
    )
    expect(pages.join('\n')).toContain('nicht unterschrieben')
  })

  it('works without logo, position and photos', async () => {
    const bytes = await buildProtocolPdf(
      input((i) => {
        i.organization.logo = undefined
        i.assessment.position = undefined
        i.photos = []
      }),
      fonts,
    )
    const all = (await pdfText(bytes)).join('\n')
    expect(all).toContain('nicht erfasst')
    expect(all).not.toContain('Anlage: Fotos')
  })

  it('long texts wrap and break onto new pages', async () => {
    const long = 'Sehr lange Maßnahmenbeschreibung mit vielen Wörtern. '.repeat(120)
    const bytes = await buildProtocolPdf(
      input((i) => (i.assessment.answers['site.powerLines'] = { value: 'present', note: long })),
      fonts,
    )
    const pages = await pdfText(bytes)
    const normal = await pdfText(await buildProtocolPdf(input(), fonts))
    expect(pages.length).toBeGreaterThan(normal.length)
  })

  it('layouts: compact is shorter and summarises unremarkable answers; table and brand colour work', async () => {
    const standard = await pdfText(await buildProtocolPdf(input(), fonts))
    const compact = await pdfText(
      await buildProtocolPdf(
        input((i) => (i.layout = 'compact')),
        fonts,
      ),
    )
    expect(compact.length).toBeLessThan(standard.length)
    expect(compact.join('\n')).toContain('Übrige Prüfpunkte')
    expect(compact.join('\n')).toContain('VORHANDEN')
    const table = await buildProtocolPdf(
      input((i) => ((i.layout = 'table'), (i.brandColor = '#e30613'))),
      fonts,
    )
    const tableText = (await pdfText(table)).join('\n')
    expect(tableText).toContain('Gefahren und Maßnahmen')
    expect(tableText).toContain('Protokoll ZW-2026-0042')
  })

  it('sanitize removes symbols the font cannot render', () => {
    expect(sanitize('⚠ Achtung 📍 ✓')).toBe('! Achtung  ')
  })
})
