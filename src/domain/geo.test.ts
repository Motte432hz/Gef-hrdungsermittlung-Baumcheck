import { describe, expect, it } from 'vitest'
import {
  appleMapsLink,
  formatDecimal,
  formatDms,
  formatNominatimAddress,
  geoUri,
  isValidLatLng,
  osmLink,
} from './geo'

const frankfurt = { lat: 50.110924, lng: 8.682127 }

describe('geo formatting', () => {
  it('decimal', () => {
    expect(formatDecimal(frankfurt)).toBe('50.110924, 8.682127')
  })
  it('degrees, minutes, seconds', () => {
    expect(formatDms(frankfurt)).toBe('50° 6′ 39.3″ N, 8° 40′ 55.7″ O')
    expect(formatDms({ lat: -33.8688, lng: -70.5 })).toBe('33° 52′ 7.7″ S, 70° 30′ 0.0″ W')
  })
  it('rounding never yields 60 seconds', () => {
    expect(formatDms({ lat: 49.99999999, lng: 8 })).toBe('50° 0′ 0.0″ N, 8° 0′ 0.0″ O')
  })
  it('map links', () => {
    expect(osmLink(frankfurt)).toBe(
      'https://www.openstreetmap.org/?mlat=50.110924&mlon=8.682127#map=18/50.110924/8.682127',
    )
    expect(geoUri(frankfurt)).toBe('geo:50.110924,8.682127?q=50.110924,8.682127')
    expect(appleMapsLink(frankfurt)).toBe('https://maps.apple.com/?q=50.110924,8.682127')
  })
  it('validates coordinates', () => {
    expect(isValidLatLng(frankfurt)).toBe(true)
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false)
    expect(isValidLatLng({ lat: NaN, lng: 0 })).toBe(false)
  })
})

describe('formatNominatimAddress', () => {
  it('street, house number, postcode and city', () => {
    expect(
      formatNominatimAddress({
        road: 'Lindenstraße',
        house_number: '4',
        postcode: '60311',
        city: 'Frankfurt am Main',
        suburb: 'Altstadt',
      }),
    ).toBe('Lindenstraße 4, 60311 Frankfurt am Main (Altstadt)')
  })
  it('village without house number', () => {
    expect(
      formatNominatimAddress({ road: 'Waldweg', postcode: '35435', village: 'Wettenberg' }),
    ).toBe('Waldweg, 35435 Wettenberg')
  })
  it('only a place', () => {
    expect(formatNominatimAddress({ town: 'Bad Homburg' })).toBe('Bad Homburg')
    expect(formatNominatimAddress({})).toBeUndefined()
  })
})
