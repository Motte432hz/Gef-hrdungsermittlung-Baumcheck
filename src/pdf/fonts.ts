import type { FontBytes } from './writer'

let cache: Promise<FontBytes> | undefined

/** Loads the embedded PDF fonts (precached by the service worker, so this works offline). */
export function loadFonts(): Promise<FontBytes> {
  cache ??= Promise.all(
    ['/fonts/DejaVuSans.ttf', '/fonts/DejaVuSans-Bold.ttf'].map(async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Font ${url}: ${res.status}`)
      return res.arrayBuffer()
    }),
  ).then(([regular, bold]) => ({ regular: regular!, bold: bold! }))
  cache.catch(() => (cache = undefined))
  return cache
}
