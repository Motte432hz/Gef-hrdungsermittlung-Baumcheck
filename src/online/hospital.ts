import { distanceKm, type LatLng } from '../domain/geo'

/**
 * Nearest hospitals from OpenStreetMap (Overpass API). Hospitals tagged with an emergency
 * department come first. Online only; the data is community-maintained – the app says so.
 */
export interface Hospital {
  name: string
  address?: string
  phone?: string
  emergency: boolean
  distanceKm: number
  position: LatLng
}

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const RADIUS_M = 40_000

interface OsmElement {
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export function parseHospitals(json: { elements?: OsmElement[] }, from: LatLng): Hospital[] {
  const out: Hospital[] = []
  for (const el of json.elements ?? []) {
    const t = el.tags ?? {}
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat === undefined || lon === undefined || !t.name) continue
    const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ')
    const city = [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ')
    out.push({
      name: t.name,
      address: [street, city].filter(Boolean).join(', ') || undefined,
      phone: t['contact:phone'] ?? t.phone,
      emergency: t.emergency === 'yes',
      distanceKm: distanceKm(from, { lat, lng: lon }),
      position: { lat, lng: lon },
    })
  }
  // Same hospital as node and area: keep the closer entry.
  const unique = new Map<string, Hospital>()
  for (const h of out) {
    const key = h.name.toLocaleLowerCase('de')
    const old = unique.get(key)
    if (!old || h.distanceKm < old.distanceKm) unique.set(key, h)
  }
  return [...unique.values()].sort(
    (a, b) => Number(b.emergency) - Number(a.emergency) || a.distanceKm - b.distanceKm,
  )
}

export async function findHospitals(
  at: LatLng,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Hospital[]> {
  const query = `[out:json][timeout:20];nwr["amenity"="hospital"](around:${RADIUS_M},${at.lat},${at.lng});out center tags 60;`
  const res = await fetchImpl(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  })
  if (!res.ok) throw new Error(`Krankenhaussuche nicht erreichbar (${res.status}).`)
  return parseHospitals(await res.json(), at)
}

/** One line for the protocol: "Name, Adresse, Tel. …". */
export const hospitalText = (h: Hospital) =>
  [h.name, h.address, h.phone && `Tel. ${h.phone}`].filter(Boolean).join(', ')
