import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export const A4 = { width: 595.28, height: 841.89 }
export const MARGIN = { top: 48, bottom: 56, left: 44, right: 44 }
export const BLACK = rgb(0, 0, 0)
export const GRAY = rgb(0.35, 0.35, 0.35)
export const LINE = rgb(0.75, 0.75, 0.75)

export type PdfStyle = 'standard' | 'compact' | 'table'

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

/**
 * Minimal flowing layout on top of pdf-lib: a cursor that moves down the page,
 * automatic page breaks, word wrapping and a footer added at the end.
 */
export class PdfWriter {
  doc!: PDFDocument
  regular!: PDFFont
  bold!: PDFFont
  page!: PDFPage
  y = 0
  readonly contentWidth = A4.width - MARGIN.left - MARGIN.right
  /** Colour for headings and decorations (black unless a brand colour is used). */
  accent = BLACK
  style: PdfStyle = 'standard'
  /** Row counter within a section (zebra stripes in the table layout). */
  rowIndex = 0

  static async create(
    fonts: FontBytes,
    meta: { title: string; author?: string; subject?: string },
  ) {
    const w = new PdfWriter()
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
    if (this.accent !== BLACK) {
      // Thin brand-coloured band at the top of every page.
      this.page.drawRectangle({
        x: 0,
        y: A4.height - 10,
        width: A4.width,
        height: 10,
        color: this.accent,
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
    opts: {
      x?: number
      width?: number
      size?: number
      bold?: boolean
      color?: ReturnType<typeof rgb>
    } = {},
  ): number {
    const size = opts.size ?? 10
    const font = opts.bold ? this.bold : this.regular
    const x = opts.x ?? MARGIN.left
    const width = opts.width ?? this.contentWidth - (x - MARGIN.left)
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
    this.rowIndex = 0
    this.ensure(sz * 3)
    this.gap(sz * 0.6)
    if (this.style === 'table') {
      // Filled title bar with white text.
      const h = this.lineHeight(sz) + 6
      this.page.drawRectangle({
        x: MARGIN.left,
        y: this.y - h,
        width: this.contentWidth,
        height: h,
        color: this.accent,
      })
      this.y -= 3
      this.text(text, { size: sz, bold: true, color: rgb(1, 1, 1), x: MARGIN.left + 6 })
      this.y -= 3
      this.gap(4)
      return
    }
    this.text(text, { size: sz, bold: true, color: this.accent })
    this.page.drawLine({
      start: { x: MARGIN.left, y: this.y + 2 },
      end: { x: A4.width - MARGIN.right, y: this.y + 2 },
      thickness: 0.8,
      color: this.accent,
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
        start: { x: MARGIN.left, y: MARGIN.bottom - 18 },
        end: { x: A4.width - MARGIN.right, y: MARGIN.bottom - 18 },
        thickness: 0.5,
        color: LINE,
      })
      const lines = this.wrap(text, this.regular, 7.5, this.contentWidth)
      lines.forEach((l, j) =>
        p.drawText(l, {
          x: MARGIN.left,
          y: MARGIN.bottom - 30 - j * 10,
          size: 7.5,
          font: this.regular,
          color: GRAY,
        }),
      )
    })
  }
}
