import type { LatLng } from '../domain/geo'
import { appleMapsLink, geoUri, osmLink } from '../domain/geo'
import { detectPlatform } from './install'

/** Link that opens the platform's map app (Apple Maps, Android geo: intent, else OSM). */
export function mapAppLink(p: LatLng): string {
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints)
  return platform === 'ios' ? appleMapsLink(p) : platform === 'android' ? geoUri(p) : osmLink(p)
}
