import {
  degrees,
  PDFDocument,
  rgb,
  type Color,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export const A4 = { width: 595.28, height: 841.89 }
export const MARGIN = { top: 48, bottom: 56, left: 44, right: 44 }
export const BLACK = rgb(0, 0, 0)
export const WHITE = rgb(1, 1, 1)
export const GRAY = rgb(0.35, 0.35, 0.35)
export const LINE = rgb(0.75, 0.75, 0.75)
export const LIGHT = rgb(0.94, 0.94, 0.94)

/** standard/compact/table are classic; modern and sidebar are the experimental layouts. */
export type PdfStyle = 'standard' | 'compact' | 'table' | 'modern' | 'sidebar'

/** Colours of a PDF: main colour, second colour and a light tint for backgrounds. */
export interface PdfTheme {
  accent: Color
  accent2: Color
  tint: Color
  /** False when no brand colour is used (classic black/grey look). */
  branded: boolean
}

export const NEUTRAL_THEME: PdfTheme = {
  accent: BLACK,
  accent2: rgb(0.25, 0.25, 0.25),
  tint: LIGHT,
  branded: false,
}

const SIDEBAR_WIDTH = 30

export interface FontBytes {
  regular: ArrayBuffer | Uint8Array
  bold: ArrayBuffer | Uint8Array
}

/** Replaces characters the embedded font cannot render (emoji, symbols) with plain text. */
export function sanitize(text: string): string {
  return text
    .replace(/[⚠⛔]/g, '!')
    .replace(/[✓✔]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\u00a0/g, ' ')
}

/** SVG path of a rectangle with rounded corners (pdf-lib has no radius option). */
function roundedRectPath(w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2)
  return `M ${rr} 0 H ${w - rr} Q ${w} 0 ${w} ${rr} V ${h - rr} Q ${w} ${h} ${w - rr} ${h} H ${rr} Q 0 ${h} 0 ${h - rr} V ${rr} Q 0 0 ${rr} 0 Z`
}

/**
 * Minimal flowing layout on top of pdf-lib: a cursor that moves down the page,
 * automatic page breaks, word wrapping, per-layout page decoration and a footer.
 */
export class PdfWriter {
  doc!: PDFDocument
  regular!: PDFFont
  bold!: PDFFont
  page!: PDFPage
  y = 0
  style: PdfStyle = 'standard'
  theme: PdfTheme = NEUTRAL_THEME
  /** Vertical text in the sidebar layout. */
  sideText = ''
  /** Row counter within a section (zebra stripes in the table layout). */
  rowIndex = 0
  /** Section counter (numbered headings in the sidebar layout). */
  sectionNo = 0

  /** Main colour for headings and decorations. */
  get accent() {
    return this.theme.accent
  }

  get left() {
    return this.style === 'sidebar' ? SIDEBAR_WIDTH + 34 : MARGIN.left
  }

  get contentWidth() {
    return A4.width - this.left - MARGIN.right
  }

  static async create(
    fonts: FontBytes,
    meta: { title: string; author?: string; subject?: string },
    opts: { style?: PdfStyle; theme?: PdfTheme; sideText?: string } = {},
  ) {
    const w = new PdfWriter()
    w.style = opts.style ?? 'standard'
    w.theme = opts.theme ?? NEUTRAL_THEME
    w.sideText = opts.sideText ?? ''
    w.doc = await PDFDocument.create()
    w.doc.registerFontkit(fontkit)
    w.regular = await w.doc.embedFont(fonts.regular, { subset: true })
    w.bold = await w.doc.embedFont(fonts.bold, { subset: true })
    w.doc.setTitle(meta.title)
    if (meta.author) w.doc.setAuthor(meta.author)
    if (meta.subject) w.doc.setSubject(meta.subject)
    w.doc.setCreator('BaumCheck')
    w.doc.setProducer('BaumCheck (pdf-lib)')
    w.newPage()
    return w
  }

  newPage() {
    this.page = this.doc.addPage([A4.width, A4.height])
    this.y = A4.height - MARGIN.top
    const { accent, accent2, branded } = this.theme
    if (this.style === 'sidebar') {
      // Coloured band on the left with the title written vertically.
      this.page.drawRectangle({
        x: 0,
        y: 0,
        width: SIDEBAR_WIDTH,
        height: A4.height,
        color: accent,
      })
      this.page.drawRectangle({
        x: SIDEBAR_WIDTH,
        y: 0,
        width: 3,
        height: A4.height,
        color: accent2,
      })
      const t = sanitize(this.sideText.toUpperCase())
      this.page.drawText(t, {
        x: SIDEBAR_WIDTH / 2 + 4,
        y: 70,
        size: 9,
        font: this.bold,
        color: WHITE,
        rotate: degrees(90),
      })
    } else if (this.style === 'modern') {
      // Thin two-colour band (the first page gets a large header band instead).
      this.page.drawRectangle({
        x: 0,
        y: A4.height - 8,
        width: A4.width * 0.7,
        height: 8,
        color: accent,
      })
      this.page.drawRectangle({
        x: A4.width * 0.7,
        y: A4.height - 8,
        width: A4.width * 0.3,
        height: 8,
        color: accent2,
      })
    } else if (branded) {
      this.page.drawRectangle({
        x: 0,
        y: A4.height - 10,
        width: A4.width,
        height: 10,
        color: accent,
      })
      this.page.drawRectangle({
        x: 0,
        y: A4.height - 13,
        width: A4.width,
        height: 3,
        color: accent2,
      })
    }
  }

  /** Starts a new page if less than `height` is left. */
  ensure(height: number) {
    if (this.y - height < MARGIN.bottom) this.newPage()
  }

  gap(h: number) {
    this.y -= h
  }

  /** Filled rectangle with rounded corners; (x, yTop) is the top-left corner. */
  roundedRect(x: number, yTop: number, width: number, height: number, color: Color, radius = 6) {
    this.page.drawSvgPath(roundedRectPath(width, height, radius), { x, y: yTop, color })
  }

  /** Splits text into lines that fit `width` (respects newlines, breaks long words). */
  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = []
    for (const para of sanitize(text).split('\n')) {
      const words = para.split(/\s+/).filter(Boolean)
      if (words.length === 0) {
        out.push('')
        continue
      }
      let line = ''
      for (let word of words) {
        // Hard-break words longer than a line (e.g. hashes, URLs).
        while (font.widthOfTextAtSize(word, size) > width) {
          let cut = word.length
          while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > width) cut--
          if (line) {
            out.push(line)
            line = ''
          }
          out.push(word.slice(0, cut))
          word = word.slice(cut)
        }
        const candidate = line ? `${line} ${word}` : word
        if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate
        else {
          out.push(line)
          line = word
        }
      }
      if (line) out.push(line)
    }
    return out
  }

  lineHeight(size: number) {
    return size * 1.35
  }

  /** Draws wrapped text at x with given width; returns the height used. Breaks pages per line. */
  text(
    text: string,
    opts: { x?: number; width?: number; size?: number; bold?: boolean; color?: Color } = {},
  ): number {
    const size = opts.size ?? 10
    const font = opts.bold ? this.bold : this.regular
    const x = opts.x ?? this.left
    const width = opts.width ?? this.contentWidth - (x - this.left)
    const lh = this.lineHeight(size)
    const lines = this.wrap(text, font, size, width)
    for (const l of lines) {
      this.ensure(lh)
      this.page.drawText(l, { x, y: this.y - size, size, font, color: opts.color ?? BLACK })
      this.y -= lh
    }
    return lines.length * lh
  }

  /** Height a wrapped text would need (for keeping blocks together). */
  measure(text: string, size: number, width: number, bold = false) {
    return (
      this.wrap(text, bold ? this.bold : this.regular, size, width).length * this.lineHeight(size)
    )
  }

  heading(text: string, size = 13) {
    const sz = this.style === 'compact' ? size * 0.88 : size
    const { accent, accent2, tint } = this.theme
    this.rowIndex = 0
    this.ensure(sz * 3.4)
    this.gap(sz * 0.6)
    const full = this.contentWidth

    if (this.style === 'table') {
      // Filled title bar with white text.
      const h = this.lineHeight(sz) + 6
      this.page.drawRectangle({
        x: this.left,
        y: this.y - h,
        width: full,
        height: h,
        color: accent,
      })
      this.page.drawRectangle({ x: this.left, y: this.y - h, width: 5, height: h, color: accent2 })
      this.y -= 3
      this.text(text, { size: sz, bold: true, color: WHITE, x: this.left + 10 })
      this.y -= 3
      this.gap(4)
      return
    }
    if (this.style === 'modern') {
      // Tinted pill with a coloured dot.
      const h = this.lineHeight(sz) + 8
      const textW = this.bold.widthOfTextAtSize(sanitize(text), sz)
      this.roundedRect(this.left, this.y, Math.min(textW + 34, full), h, tint, h / 2)
      this.page.drawCircle({ x: this.left + 12, y: this.y - h / 2, size: 4, color: accent2 })
      this.y -= 4
      this.text(text, { size: sz, bold: true, color: accent, x: this.left + 22 })
      this.y -= 4
      this.gap(6)
      return
    }
    if (this.style === 'sidebar') {
      // Large section number in the second colour, title next to it.
      this.sectionNo++
      const no = String(this.sectionNo).padStart(2, '0')
      const top = this.y
      this.page.drawText(no, {
        x: this.left,
        y: this.y - sz * 1.4,
        size: sz * 1.6,
        font: this.bold,
        color: accent2,
      })
      this.text(text, { size: sz, bold: true, color: accent, x: this.left + sz * 2.6 })
      this.y = Math.min(this.y, top - sz * 1.9)
      this.page.drawLine({
        start: { x: this.left, y: this.y + 2 },
        end: { x: this.left + full, y: this.y + 2 },
        thickness: 0.5,
        color: LINE,
      })
      this.gap(6)
      return
    }
    this.text(text, { size: sz, bold: true, color: accent })
    this.page.drawLine({
      start: { x: this.left, y: this.y + 2 },
      end: { x: this.left + full, y: this.y + 2 },
      thickness: 0.8,
      color: accent,
    })
    this.gap(this.style === 'compact' ? 4 : 6)
  }

  /** Draws an image scaled to fit the box at the cursor and moves below it; returns its height. */
  image(img: PDFImage, x: number, maxW: number, maxH: number): number {
    const scale = Math.min(maxW / img.width, maxH / img.height, 1)
    const w = img.width * scale
    const h = img.height * scale
    this.ensure(h)
    this.page.drawImage(img, { x, y: this.y - h, width: w, height: h })
    this.y -= h
    return h
  }

  /** Footer on every page: "Seite x von y" and a free text. */
  footer(textFor: (pageNo: number, pages: number) => string) {
    const pages = this.doc.getPages()
    pages.forEach((p, i) => {
      const text = sanitize(textFor(i + 1, pages.length))
      p.drawLine({
        start: { x: this.left, y: MARGIN.bottom - 18 },
        end: { x: A4.width - MARGIN.right, y: MARGIN.bottom - 18 },
        thickness: 0.5,
        color: LINE,
      })
      const lines = this.wrap(text, this.regular, 7.5, this.contentWidth)
      lines.forEach((l, j) =>
        p.drawText(l, {
          x: this.left,
          y: MARGIN.bottom - 30 - j * 10,
          size: 7.5,
          font: this.regular,
          color: GRAY,
        }),
      )
    })
  }
}
