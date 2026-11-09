export type StorageStatus = {
  supported: boolean
  persisted: boolean
  usageBytes?: number
  quotaBytes?: number
}

/** Requests persistent storage so the browser does not evict local protocols. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (!navigator.storage) return { supported: false, persisted: false }
  const [persisted, estimate] = await Promise.all([
    navigator.storage.persisted?.().catch(() => false) ?? false,
    navigator.storage.estimate?.().catch(() => undefined),
  ])
  return {
    supported: true,
    persisted,
    usageBytes: estimate?.usage,
    quotaBytes: estimate?.quota,
  }
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return '–'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  const digits = i === 0 || value >= 100 ? 0 : 1
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${units[i]}`
}
