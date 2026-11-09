import type { StoredFile } from '../domain/types'
import { storedFileToBlob } from './storedFile'

export type ShareResult = 'shared' | 'cancelled' | 'unsupported'

/** Opens the share sheet with the PDF (mail, WhatsApp, cloud …) where supported. */
export async function sharePdf(
  file: StoredFile,
  fileName: string,
  title: string,
): Promise<ShareResult> {
  const pdf = new File([storedFileToBlob(file)], fileName, { type: 'application/pdf' })
  if (!navigator.canShare?.({ files: [pdf] })) return 'unsupported'
  try {
    await navigator.share({ files: [pdf], title, text: title })
    return 'shared'
  } catch {
    return 'cancelled'
  }
}

/** Saves the PDF via a download link (desktop, Android) or opens it (iOS). */
export function downloadPdf(file: StoredFile, fileName: string) {
  const url = URL.createObjectURL(storedFileToBlob(file))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
