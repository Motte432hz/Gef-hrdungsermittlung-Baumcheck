import type { StoredFile } from '../domain/types'
import { dominantColors } from './color'
import { storedFileToBlob } from './storedFile'

/** Suggested brand colours from the logo (most characteristic first). */
export async function logoColors(logo: StoredFile): Promise<string[]> {
  const bitmap = await createImageBitmap(storedFileToBlob(logo))
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.drawImage(bitmap, 0, 0, size, size)
  bitmap.close()
  return dominantColors(ctx.getImageData(0, 0, size, size).data)
}
