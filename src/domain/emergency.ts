/** Everything the team needs for an emergency call, in one place. */
export function emergencyText(a: {
  address?: string
  coords?: string
  w3w?: string
  access?: string
  hospital?: string
}): string {
  return [
    a.address && `Adresse: ${a.address}`,
    a.coords && `Koordinaten: ${a.coords}`,
    a.w3w && `what3words: ${a.w3w}`,
    a.access && `Zufahrt/Treffpunkt: ${a.access}`,
    a.hospital && `Krankenhaus: ${a.hospital}`,
  ]
    .filter(Boolean)
    .join('\n')
}
