/** "Lindenstraße 4, 60311 Frankfurt" */
export function formatAddress(a: { street?: string; postalCode?: string; city?: string }): string {
  const cityLine = [a.postalCode, a.city].filter(Boolean).join(' ')
  return [a.street, cityLine].filter(Boolean).join(', ')
}
