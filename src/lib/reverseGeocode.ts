import { formatNominatimAddress, type LatLng, type NominatimAddress } from '../domain/geo'

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

/**
 * Address suggestion from OpenStreetMap (Nominatim). Only called on user request, never
 * automatically (usage policy: max. 1 request/second, no bulk use).
 */
export async function reverseGeocode(
  { lat, lng }: LatLng,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const url = `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}&accept-language=de`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data = (await res.json()) as { address?: NominatimAddress }
  return data.address ? formatNominatimAddress(data.address) : undefined
}
