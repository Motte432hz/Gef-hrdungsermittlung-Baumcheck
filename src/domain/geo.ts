/** Coordinate formatting and map links for the location step, PDF and rescue services. */

export interface LatLng {
  lat: number
  lng: number
}

/** "50.110924, 8.682127" – the format rescue control centres usually ask for. */
export function formatDecimal({ lat, lng }: LatLng, digits = 6): string {
  return `${lat.toFixed(digits)}, ${lng.toFixed(digits)}`
}

/** "50° 6′ 39.3″ N, 8° 40′ 55.7″ E" */
export function formatDms({ lat, lng }: LatLng): string {
  const part = (v: number, pos: string, neg: string) => {
    const abs = Math.abs(v)
    let deg = Math.floor(abs)
    let min = Math.floor((abs - deg) * 60)
    let sec = Math.round(((abs - deg) * 60 - min) * 60 * 10) / 10
    if (sec >= 60) {
      sec = 0
      min += 1
    }
    if (min >= 60) {
      min = 0
      deg += 1
    }
    return `${deg}° ${min}′ ${sec.toFixed(1)}″ ${v >= 0 ? pos : neg}`
  }
  return `${part(lat, 'N', 'S')}, ${part(lng, 'O', 'W')}`
}

export const osmLink = ({ lat, lng }: LatLng, zoom = 18) =>
  `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}#map=${zoom}/${lat.toFixed(6)}/${lng.toFixed(6)}`

/** Opens the default map app on Android. */
export const geoUri = ({ lat, lng }: LatLng) =>
  `geo:${lat.toFixed(6)},${lng.toFixed(6)}?q=${lat.toFixed(6)},${lng.toFixed(6)}`

/** Opens Apple Maps on iPhone/iPad (and Google Maps elsewhere via redirect). */
export const appleMapsLink = ({ lat, lng }: LatLng) =>
  `https://maps.apple.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`

export function isValidLatLng(p: Partial<LatLng>): p is LatLng {
  return (
    typeof p.lat === 'number' &&
    typeof p.lng === 'number' &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  )
}

/** Nominatim reverse geocoding result (subset). */
export interface NominatimAddress {
  road?: string
  pedestrian?: string
  footway?: string
  path?: string
  house_number?: string
  postcode?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  hamlet?: string
  suburb?: string
}

/** "Lindenstraße 4, 60311 Frankfurt am Main" from a Nominatim address. */
export function formatNominatimAddress(a: NominatimAddress): string | undefined {
  const street = a.road ?? a.pedestrian ?? a.footway ?? a.path
  const streetLine = street ? [street, a.house_number].filter(Boolean).join(' ') : undefined
  const place = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet
  const placeLine = [a.postcode, place].filter(Boolean).join(' ')
  const district = a.suburb && place && a.suburb !== place ? ` (${a.suburb})` : ''
  const result = [streetLine, placeLine ? placeLine + district : undefined]
    .filter(Boolean)
    .join(', ')
  return result || undefined
}
