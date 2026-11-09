import QRCode from 'qrcode'
import type { PDFPage } from 'pdf-lib'
import { rgb } from 'pdf-lib'

/** Draws a QR code as vector squares (sharp in print, works offline). */
export function drawQr(page: PDFPage, text: string, x: number, yTop: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const quiet = 2
  const cell = size / (n + quiet * 2)
  page.drawRectangle({ x, y: yTop - size, width: size, height: size, color: rgb(1, 1, 1) })
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) {
        page.drawRectangle({
          x: x + (c + quiet) * cell,
          y: yTop - (r + quiet + 1) * cell,
          width: cell,
          height: cell,
          color: rgb(0, 0, 0),
        })
      }
    }
  }
}
