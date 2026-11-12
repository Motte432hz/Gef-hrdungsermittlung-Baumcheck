import { distanceKm, type LatLng } from '../domain/geo'

/**
 * Nearest hospitals from OpenStreetMap (Nominatim, Photon or Overpass). Hospitals tagged with an emergency
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
  return dedupe(out)
}

/** Same hospital twice (e.g. node and area): keep the closer entry; emergency first. */
function dedupe(list: Hospital[]): Hospital[] {
  const unique = new Map<string, Hospital>()
  for (const h of list) {
    const key = h.name.toLocaleLowerCase('de')
    const old = unique.get(key)
    if (!old || h.distanceKm < old.distanceKm || (h.emergency && !old.emergency)) unique.set(key, h)
  }
  return [...unique.values()].sort(
    (a, b) => Number(b.emergency) - Number(a.emergency) || a.distanceKm - b.distanceKm,
  )
}

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
export const PHOTON_URL = 'https://photon.komoot.io/api/'

/** About 40 km around the site. */
const BOX_DEG = 0.35

interface NominatimPlace {
  lat: string
  lon: string
  name?: string
  address?: Record<string, string>
  extratags?: Record<string, string> | null
}

export function parseNominatim(list: NominatimPlace[], from: LatLng): Hospital[] {
  return dedupe(
    list
      .filter((p) => p.name)
      .map((p) => {
        const a = p.address ?? {}
        const t = p.extratags ?? {}
        const street = [a.road, a.house_number].filter(Boolean).join(' ')
        const city = [a.postcode, a.city ?? a.town ?? a.village].filter(Boolean).join(' ')
        const position = { lat: Number(p.lat), lng: Number(p.lon) }
        return {
          name: p.name!,
          address: [street, city].filter(Boolean).join(', ') || undefined,
          phone: t['contact:phone'] ?? t.phone,
          emergency: t.emergency === 'yes',
          distanceKm: distanceKm(from, position),
          position,
        }
      }),
  )
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

export function parsePhoton(json: { features?: PhotonFeature[] }, from: LatLng): Hospital[] {
  return dedupe(
    (json.features ?? [])
      .filter((f) => f.properties.name)
      .map((f) => {
        const p = f.properties
        const position = { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }
        const street = [p.street, p.housenumber].filter(Boolean).join(' ')
        const city = [p.postcode, p.city].filter(Boolean).join(' ')
        return {
          name: p.name!,
          address: [street, city].filter(Boolean).join(', ') || undefined,
          emergency: false,
          distanceKm: distanceKm(from, position),
          position,
        }
      })
      .filter((h) => h.distanceKm <= RADIUS_M / 1000),
  )
}

/** Aborts after 12 s or with the caller's signal (works on older Safari, too). */
function timeout(signal?: AbortSignal): AbortSignal {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12_000)
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true })
  ctrl.signal.addEventListener('abort', () => clearTimeout(timer), { once: true })
  return ctrl.signal
}

async function fromNominatim(at: LatLng, f: typeof fetch, signal?: AbortSignal) {
  const box = [at.lng - BOX_DEG, at.lat + BOX_DEG, at.lng + BOX_DEG, at.lat - BOX_DEG].join(',')
  const res = await f(
    `${NOMINATIM_URL}?format=jsonv2&amenity=hospital&viewbox=${box}&bounded=1&limit=40&extratags=1&addressdetails=1&accept-language=de`,
    { signal: timeout(signal) },
  )
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  return parseNominatim(await res.json(), at)
}

async function fromPhoton(at: LatLng, f: typeof fetch, signal?: AbortSignal) {
  const res = await f(
    `${PHOTON_URL}?q=Krankenhaus&lat=${at.lat}&lon=${at.lng}&osm_tag=amenity:hospital&limit=20&lang=de`,
    { signal: timeout(signal) },
  )
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  return parsePhoton(await res.json(), at)
}

async function fromOverpass(at: LatLng, f: typeof fetch, signal?: AbortSignal) {
  const query = `[out:json][timeout:20];nwr["amenity"="hospital"](around:${RADIUS_M},${at.lat},${at.lng});out center tags 60;`
  const res = await f(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal: timeout(signal),
  })
  if (!res.ok) throw new Error(`Overpass ${res.status}`)
  return parseHospitals(await res.json(), at)
}

/**
 * Asks several OpenStreetMap services one after another (public servers are often busy or
 * refuse requests) and returns the first non-empty answer.
 */
export async function findHospitals(
  at: LatLng,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Hospital[]> {
  const errors: string[] = []
  let empty = false
  for (const source of [fromNominatim, fromPhoton, fromOverpass]) {
    try {
      const list = await source(at, fetchImpl, signal)
      if (list.length) return list
      empty = true
    } catch (e) {
      if (signal?.aborted) throw e
      errors.push((e as Error).message)
    }
  }
  if (empty) return []
  throw new Error(`Krankenhaussuche nicht erreichbar (${errors.join('; ')}).`)
}

/** One line for the protocol: "Name, Adresse, Tel. …". */
export const hospitalText = (h: Hospital) =>
  [h.name, h.address, h.phone && `Tel. ${h.phone}`].filter(Boolean).join(', ')
