import type { StoredFile } from '../domain/types'

/**
 * Binary data is stored as ArrayBuffer, not Blob: WebKit cannot put Blobs into IndexedDB
 * in private/ephemeral sessions (and older Safari versions had Blob bugs in general).
 */
export async function toStoredFile(blob: Blob, type = blob.type): Promise<StoredFile> {
  return { type: type || 'application/octet-stream', data: await blob.arrayBuffer() }
}

export function storedFileToBlob(file: StoredFile): Blob {
  return new Blob([file.data], { type: file.type })
}
