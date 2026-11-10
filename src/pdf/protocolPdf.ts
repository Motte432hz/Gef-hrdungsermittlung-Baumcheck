import type { PDFImage } from 'pdf-lib'
import type {
  Assessment,
  Customer,
  Organization,
  Signature,
  StoredFile,
  Tree,
} from '../domain/types'
import type { FormDefinition } from '../form/schema'
import { buildSummary, signaturePlace, type SummaryRow } from '../report/summary'
import { requiredSignatures, signatureMethodText } from '../report/signatures'
import { ROLE_LABELS } from '../domain/roles'
import { formatDecimal, formatDms, osmLink } from '../domain/geo'
import { getSpecies, hazardsForSpecies, plannedActivities, ACTIVITY_LABELS } from '../form/species'
import { shortHash } from '../lib/hash'
import { treeLabel } from '../wizard/trees/treeLabel'
import { rgb } from 'pdf-lib'
import { A4, BLACK, GRAY, LINE, MARGIN, PdfWriter, type FontBytes, type PdfStyle } from './writer'
import { hexToRgb, makePalette } from '../lib/color'

const ZEBRA = rgb(0.94, 0.94, 0.94)
import { drawQr } from './qr'
import { personLabel } from '../domain/people'

export interface ProtocolPdfInput {
  definition: FormDefinition
  organization: Organization
  assessment: Assessment
  protocolNumber: string
  completedAt: string
  trees: Tree[]
  customer?: Customer
  signatures: Signature[]
  photos: { treeId: string; file: StoredFile }[]
  contentHash: string
  /** Layout variant and optional brand colour (#rrggbb). Default: standard, black. */
  layout?: PdfStyle
  brandColor?: string
}

const dateDe = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}
const dateTimeDe = (iso: string) =>
  new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  })

const answerText = (a: Assessment, id: string) => {
  const v = a.answers[id]?.value
  return typeof v === 'string' ? v.trim() : ''
}

async function embed(w: PdfWriter, file: StoredFile | undefined): Promise<PDFImage | undefined> {
  if (!file) return undefined
  try {
    return file.type === 'image/png'
      ? await w.doc.embedPng(file.data)
      : await w.doc.embedJpg(file.data)
  } catch {
    return undefined
  }
}

/** Label/value row; deviations get a bar, bold value and the measure below (b/w printable). */
function row(w: PdfWriter, r: SummaryRow) {
  const size = w.style === 'compact' ? 8 : 9
  const labelW = w.contentWidth * 0.42
  const valueX = MARGIN.left + labelW + 8
  const valueW = w.contentWidth - labelW - 8 - (w.style === 'table' ? 4 : 0)
  const flagged = r.tone === 'bad' || r.tone === 'danger'
  const value = flagged ? r.value.toUpperCase() : r.value
  const h =
    Math.max(w.measure(r.label, size, labelW - 8), w.measure(value, size, valueW, flagged)) +
    (r.note !== undefined ? w.measure(`${r.noteLabel}: ${r.note || '–'}`, size, valueW, true) : 0)
  w.ensure(Math.min(h + 4, 200))
  const top = w.y
  if (w.style === 'table' && w.rowIndex++ % 2 === 1 && h + 4 < top - MARGIN.bottom) {
    // Zebra stripe behind the row.
    w.page.drawRectangle({
      x: MARGIN.left,
      y: top - h - 2,
      width: w.contentWidth,
      height: h + 3,
      color: ZEBRA,
    })
  }
  w.text(r.label, {
    x: MARGIN.left + (flagged || w.style === 'table' ? 8 : 0),
    width: labelW - 8,
    size,
    color: flagged ? BLACK : GRAY,
  })
  const afterLabel = w.y
  w.y = top
  w.text(value, { x: valueX, width: valueW, size, bold: flagged })
  if (r.note !== undefined) {
    w.text(`${r.noteLabel ?? 'Maßnahme'}: ${r.note || '–'}`, {
      x: valueX,
      width: valueW,
      size,
      bold: true,
    })
  }
  w.y = Math.min(w.y, afterLabel)
  if (flagged && top > w.y) {
    // Bar only if the row stayed on one page. Dark enough for b/w printing.
    w.page.drawRectangle({
      x: MARGIN.left,
      y: w.y + 2,
      width: r.tone === 'danger' ? 4 : 2.5,
      height: top - w.y - 2,
      color: r.tone === 'danger' ? BLACK : w.accent,
    })
  }
  if (w.style === 'table' && top > w.y) {
    w.page.drawLine({
      start: { x: MARGIN.left, y: w.y + 1 },
      end: { x: MARGIN.left + w.contentWidth, y: w.y + 1 },
      thickness: 0.4,
      color: LINE,
    })
  }
  w.gap(w.style === 'compact' ? 2 : 3)
}

/** Compact layout: unremarkable answers are summarised in one line per section. */
function compactRows(rows: SummaryRow[]): SummaryRow[] {
  const ok = rows.filter((r) => r.tone === 'ok')
  const rest = rows.filter((r) => r.tone !== 'ok' && r.tone !== 'empty')
  if (ok.length === 0) return rest
  return [
    ...rest,
    {
      itemId: '_ok',
      label: `Übrige Prüfpunkte (${ok.length})`,
      value: 'in Ordnung (Ja bzw. nicht vorhanden)',
      tone: 'neutral',
    },
  ]
}

export async function buildProtocolPdf(
  input: ProtocolPdfInput,
  fonts: FontBytes,
): Promise<Uint8Array> {
  const { definition, organization: org, assessment: a, trees, customer } = input
  const w = await PdfWriter.create(fonts, {
    title: `${definition.title} ${input.protocolNumber}`,
    author: org.name,
    subject: 'Einsatzbezogene Gefährdungsermittlung',
  })
  w.style = input.layout ?? 'standard'
  if (input.brandColor) {
    // The 700 step is dark enough for headings and stays readable when printed in b/w.
    const [r, g, b] = hexToRgb(makePalette(input.brandColor)[700])
    w.accent = rgb(r / 255, g / 255, b / 255)
    // The first page was created before the colour was known.
    w.page.drawRectangle({ x: 0, y: A4.height - 10, width: A4.width, height: 10, color: w.accent })
  }

  // ---- Header -----------------------------------------------------------
  const logo = await embed(w, org.logo)
  const top = w.y
  if (logo) w.image(logo, MARGIN.left, 150, 56)
  const logoBottom = w.y
  w.y = top
  const orgLines = [
    org.name,
    org.street,
    [org.postalCode, org.city].filter(Boolean).join(' '),
    [org.phone && `Tel. ${org.phone}`, org.email].filter(Boolean).join(' · '),
  ].filter(Boolean) as string[]
  const orgX = MARGIN.left + w.contentWidth * 0.5
  orgLines.forEach((l, i) =>
    w.text(l, { x: orgX, width: w.contentWidth * 0.5, size: i === 0 ? 10 : 8.5, bold: i === 0 }),
  )
  w.y = Math.min(w.y, logoBottom) - 14

  w.text(definition.title, { size: 15, bold: true, color: w.accent })
  w.gap(2)
  const meta = [
    `Protokoll-Nr. ${input.protocolNumber}`,
    `Einsatzdatum ${dateDe(a.date)}`,
    `abgeschlossen ${dateTimeDe(input.completedAt)} Uhr`,
    a.version > 1 ? `Version ${a.version} (Korrektur einer früheren Fassung)` : undefined,
  ].filter(Boolean)
  w.text(meta.join('   ·   '), { size: 9.5 })
  w.gap(8)

  const sections = buildSummary({
    definition,
    assessment: a,
    trees,
    customer,
    photoCount: Object.fromEntries(
      trees.map((t) => [t.id, input.photos.filter((p) => p.treeId === t.id).length]),
    ),
  })
  const rowsOf = (stepId: string) =>
    sections.filter((s) => s.stepId === stepId).flatMap((s) => s.rows)
  const find = (stepId: string, itemId: string) => rowsOf(stepId).find((r) => r.itemId === itemId)

  // ---- At a glance ----------------------------------------------------------
  w.heading('Auf einen Blick')
  const glance: [string, string][] = [
    ['Einsatzart', find('job', 'job.types')?.value ?? '–'],
    ['Geplante Arbeiten', find('work', 'work.types')?.value ?? '–'],
    ['Kunde / Objekt', find('job', 'job.customer')?.value ?? '–'],
    [
      'Arbeitszeit',
      [answerText(a, 'job.timeFrom'), answerText(a, 'job.timeTo')].filter(Boolean).join(' – ') ||
        '–',
    ],
    ['Aufsichtsführende Person', find('job', 'job.supervisor')?.value ?? '–'],
  ]
  for (const t of [...trees].sort((x, y) => x.index - y.index)) {
    const result = sections
      .find((s) => s.stepId === 'treeAssessment' && s.treeId === t.id)
      ?.rows.find((r) => r.itemId === 'tree.result')
    glance.push([treeLabel(t), `Baum sicher für die geplanten Arbeiten: ${result?.value ?? '–'}`])
  }
  for (const [label, value] of glance)
    row(w, { itemId: label, label, value, tone: value.includes(': Nein') ? 'danger' : 'neutral' })

  // ---- Location & rescue (with QR code) ------------------------------------
  w.heading('Standort und Rettung')
  const pos = a.position
  const qrSize = 92
  const locTop = w.y
  w.ensure(qrSize + 8)
  const locLines: [string, string][] = [
    ['Adresse', answerText(a, 'site.address') || '–'],
    [
      'Koordinaten',
      pos
        ? `${formatDecimal(pos)}  (${formatDms(pos)}), Genauigkeit ± ${pos.accuracy ?? '?'} m`
        : 'nicht erfasst',
    ],
    ['what3words', answerText(a, 'site.w3w') || '–'],
    ['Zufahrt / Treffpunkt Rettungsdienst', answerText(a, 'site.rescueAccess') || '–'],
    ['Nächstes Krankenhaus', answerText(a, 'site.hospital') || '–'],
  ]
  const textW = pos ? w.contentWidth - qrSize - 12 : w.contentWidth
  for (const [label, value] of locLines) {
    w.text(label, { size: 8, color: GRAY, width: textW })
    w.text(value, { size: 9.5, width: textW, bold: label === 'Koordinaten' })
    w.gap(2)
  }
  if (pos) {
    const yTop = w.y > locTop ? w.y : locTop
    drawQr(w.page, osmLink(pos), A4.width - MARGIN.right - qrSize, yTop, qrSize)
    w.page.drawText('Karte (QR-Code)', {
      x: A4.width - MARGIN.right - qrSize + 14,
      y: yTop - qrSize - 10,
      size: 7,
      font: w.regular,
      color: GRAY,
    })
    w.y = Math.min(w.y, yTop - qrSize - 14)
  }

  // ---- Hazards and measures ---------------------------------------------------
  w.heading('Gefahren und Maßnahmen')
  const findings = sections.flatMap((s) =>
    s.rows
      .filter((r) => r.tone === 'bad' || r.tone === 'danger')
      .map((r) => ({ ...r, label: `${s.title}: ${r.label}` })),
  )
  if (findings.length === 0) w.text('Keine Gefahren oder Abweichungen angegeben.', { size: 9.5 })
  for (const f of findings) row(w, f)

  // ---- All details -------------------------------------------------------------
  for (const s of sections) {
    w.heading(s.title, 11.5)
    for (const r of w.style === 'compact' ? compactRows(s.rows) : s.rows) row(w, r)
  }

  // ---- Personal protective equipment ---------------------------------------
  const withGear = a.team.filter((m) => m.gear && m.gear.length > 0)
  if (withGear.length > 0) {
    w.heading('Persönliche Schutzausrüstung (laut Profil)')
    for (const m of withGear) {
      w.ensure(30)
      w.text(personLabel(m), { size: 10, bold: true })
      for (const g of m.gear!) {
        const details = [
          g.serialNumber && `Nr. ${g.serialNumber}`,
          g.nextInspection && `nächste Prüfung ${dateDe(g.nextInspection)}`,
          g.note,
        ]
          .filter(Boolean)
          .join(', ')
        w.text(`${g.name}${details ? ` (${details})` : ''}`, { size: 9, x: MARGIN.left + 10 })
      }
      w.gap(3)
    }
  }

  // ---- Species-specific advice -----------------------------------------------
  const activities = plannedActivities(a.answers)
  const speciesTrees = [...trees]
    .sort((x, y) => x.index - y.index)
    .map((t) => ({
      t,
      s: getSpecies(
        typeof t.answers['tree.species']?.value === 'string'
          ? (t.answers['tree.species']!.value as string)
          : undefined,
      ),
    }))
    .filter((x) => x.s && (x.s.hazards.length > 0 || x.s.note))
  if (speciesTrees.length > 0) {
    w.heading('Artspezifische Hinweise')
    for (const { t, s } of speciesTrees) {
      w.ensure(40)
      w.text(`${treeLabel(t)} (${s!.la})`, { size: 10, bold: true })
      if (s!.note) w.text(s!.note, { size: 9 })
      for (const v of hazardsForSpecies(s!, activities).filter((x) => x.relevant)) {
        w.text(v.hazard.title, { size: 9, bold: true, x: MARGIN.left + 8 })
        for (const adv of v.advice) {
          w.text(`${ACTIVITY_LABELS[adv.key]}: ${adv.text}`, { size: 8.5, x: MARGIN.left + 16 })
        }
      }
      w.gap(4)
    }
  }

  // ---- Signatures --------------------------------------------------------------
  w.heading('Unterschriften')
  const place = signaturePlace({ assessment: a, customer })
  w.text(`Ort: ${place || '–'}   ·   Datum: ${dateDe(a.date)}`, { size: 9.5 })
  w.gap(4)
  const req = requiredSignatures(a.team, a.supervisorMemberId, input.signatures, input.contentHash)
  for (const r of req) {
    w.ensure(110)
    w.gap(4)
    const statement =
      r.statement === 'supervisor' ? definition.statements.supervisor : definition.statements.member
    w.text(`„${statement}“`, { size: 9 })
    w.gap(2)
    const sig = r.signature
    const img = await embed(w, sig?.image)
    const blockTop = w.y
    if (img) w.image(img, MARGIN.left, 180, 54)
    w.page.drawLine({
      start: { x: MARGIN.left, y: w.y - 2 },
      end: { x: MARGIN.left + 200, y: w.y - 2 },
      thickness: 0.6,
      color: BLACK,
    })
    const after = w.y - 6
    w.y = blockTop
    const infoX = MARGIN.left + 215
    const infoW = w.contentWidth - 215
    w.text(`${personLabel(r.member)}${r.member.company ? ` (${r.member.company})` : ''}`, {
      x: infoX,
      width: infoW,
      size: 10,
      bold: true,
    })
    w.text(r.member.roles.map((x) => ROLE_LABELS[x]).join(', ') || '–', {
      x: infoX,
      width: infoW,
      size: 9,
    })
    if (sig) {
      w.text(`${signatureMethodText(sig)}, ${dateTimeDe(sig.signedAt)} Uhr`, {
        x: infoX,
        width: infoW,
        size: 8.5,
        color: GRAY,
      })
      if (sig.position)
        w.text(`GPS ${formatDecimal(sig.position)}`, {
          x: infoX,
          width: infoW,
          size: 8.5,
          color: GRAY,
        })
    } else {
      w.text('nicht unterschrieben', { x: infoX, width: infoW, size: 9, bold: true })
    }
    w.y = Math.min(w.y, after)
    w.gap(8)
  }

  // ---- Photo appendix ------------------------------------------------------------
  const sortedTrees = [...trees].sort((x, y) => x.index - y.index)
  const photoList = sortedTrees.flatMap((t) =>
    input.photos
      .filter((p) => p.treeId === t.id)
      .map((p, i) => ({ caption: `${treeLabel(t)} – Foto ${i + 1}`, file: p.file })),
  )
  if (photoList.length > 0) {
    const boxH = (A4.height - MARGIN.top - MARGIN.bottom - 60) / 2
    for (let i = 0; i < photoList.length; i++) {
      if (i % 2 === 0) {
        w.newPage()
        w.text(i === 0 ? 'Anlage: Fotos' : 'Anlage: Fotos (Fortsetzung)', { size: 13, bold: true })
        w.gap(6)
      }
      const p = photoList[i]!
      const img = await embed(w, p.file)
      w.text(p.caption, { size: 9.5, bold: true })
      if (img) {
        w.image(img, MARGIN.left, w.contentWidth, boxH - 20)
      } else {
        w.text('(Foto konnte nicht eingebettet werden)', { size: 9, color: GRAY })
      }
      w.gap(14)
    }
  }

  // ---- Footer ---------------------------------------------------------------------
  w.footer(
    (n, total) =>
      `Seite ${n} von ${total}  ·  Protokoll ${input.protocolNumber}  ·  Prüfwert ${shortHash(input.contentHash, 4)}  ·  erstellt mit BaumCheck`,
  )
  return w.doc.save({ useObjectStreams: false })
}
