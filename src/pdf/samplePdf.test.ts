// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { buildSamplePdf } from './samplePdf'
import type { Organization } from '../domain/types'

const fonts = {
  regular: readFileSync('public/fonts/DejaVuSans.ttf'),
  bold: readFileSync('public/fonts/DejaVuSans-Bold.ttf'),
}

describe('sample PDF', () => {
  it.each(['standard', 'compact', 'table'] as const)(
    'builds a %s sample with company data',
    async (layout) => {
      const org = {
        id: 'o',
        organizationId: 'o',
        createdAt: '',
        updatedAt: '',
        syncState: 'local',
        name: 'Rotbuche Baumpflege',
        numberPrefix: 'RB',
        reportEmails: [],
      } as Organization
      const pdf = await buildSamplePdf(org, { layout, brandColor: '#e30613' }, fonts)
      const doc = await getDocument({ data: pdf.slice(), useSystemFonts: false }).promise
      const text = (await (await doc.getPage(1)).getTextContent()).items
        .map((i) => ('str' in i ? i.str : ''))
        .join(' ')
      expect(text).toContain('Rotbuche Baumpflege')
      expect(text).toContain('Protokoll-Nr. RB-MUSTER')
    },
  )
})
