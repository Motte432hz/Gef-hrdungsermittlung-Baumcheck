import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeoPosition } from '../../domain/types'

/** Small OpenStreetMap preview (online only). Loaded lazily to keep the app start fast. */
export default function MapView({ position }: { position: GeoPosition }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const center: L.LatLngExpression = [position.lat, position.lng]
    const map = L.map(ref.current, {
      center,
      zoom: 17,
      // Avoid trapping the page scroll on touch screens.
      dragging: !L.Browser.mobile,
      scrollWheelZoom: false,
      tapHold: false,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap-Mitwirkende',
    }).addTo(map)
    if (position.accuracy) {
      L.circle(center, {
        radius: position.accuracy,
        color: '#2f7a47',
        weight: 1,
        fillOpacity: 0.15,
      }).addTo(map)
    }
    L.circleMarker(center, {
      radius: 8,
      color: '#fff',
      weight: 3,
      fillColor: '#b91c1c',
      fillOpacity: 1,
    }).addTo(map)
    return () => {
      map.remove()
    }
  }, [position.lat, position.lng, position.accuracy])

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Karte mit Standort"
      className="z-0 h-52 w-full overflow-hidden rounded-xl border-2 border-stone-200 dark:border-stone-700"
    />
  )
}
