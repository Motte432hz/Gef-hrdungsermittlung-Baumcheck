/** "Karl Kletter „Kalle“" – full name with call name, if one is set. */
export function personLabel(p: { name: string; nickname?: string }): string {
  const nick = p.nickname?.trim()
  return nick && nick !== p.name.trim() ? `${p.name} „${nick}“` : p.name
}
