/** Small field validators for profile forms. Return a German message or undefined. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const required = (v: string | undefined, label: string) =>
  !v || !v.trim() ? `${label} ist ein Pflichtfeld.` : undefined

export const email = (v: string | undefined) =>
  v && v.trim() && !EMAIL.test(v.trim()) ? 'Bitte eine gültige E-Mail-Adresse eingeben.' : undefined

/** Splits a list of e-mail addresses (comma, semicolon, space or line separated). */
export function parseEmailList(v: string): string[] {
  return v
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export const emailList = (v: string) => {
  const invalid = parseEmailList(v).filter((e) => !EMAIL.test(e))
  return invalid.length ? `Ungültige E-Mail-Adresse: ${invalid.join(', ')}` : undefined
}

export const postalCode = (v: string | undefined) =>
  v && v.trim() && !/^\d{4,5}$/.test(v.trim()) ? 'Postleitzahl: 4 oder 5 Ziffern.' : undefined

export const numberPrefix = (v: string | undefined) =>
  !v || !/^[A-Za-z0-9]{1,6}$/.test(v.trim())
    ? 'Kürzel: 1 bis 6 Buchstaben oder Ziffern, z. B. ZW.'
    : undefined
