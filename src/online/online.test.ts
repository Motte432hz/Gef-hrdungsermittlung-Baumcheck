import { describe, expect, it } from 'vitest'
import { findHospitals, hospitalText, parseHospitals, parsePhoton } from './hospital'
import { fetchSiteWeather } from './weather'

const site = { lat: 50.11, lng: 8.68 }

describe('hospitals', () => {
  it('emergency departments first, then by distance; duplicates removed', () => {
    const list = parseHospitals(
      {
        elements: [
          { lat: 50.12, lon: 8.68, tags: { name: 'Klinik Nah', amenity: 'hospital' } },
          {
            center: { lat: 50.2, lon: 8.7 },
            tags: {
              name: 'Uniklinik',
              emergency: 'yes',
              'addr:street': 'Theodor-Stern-Kai',
              'addr:housenumber': '7',
              'addr:postcode': '60590',
              'addr:city': 'Frankfurt',
              phone: '+49 69 6301 0',
            },
          },
          { lat: 50.25, lon: 8.7, tags: { name: 'Uniklinik', emergency: 'yes' } },
          { lat: 50.3, lon: 8.7, tags: { amenity: 'hospital' } }, // no name
        ],
      },
      site,
    )
    expect(list.map((h) => [h.name, h.emergency])).toEqual([
      ['Uniklinik', true],
      ['Klinik Nah', false],
    ])
    expect(list[0]!.distanceKm).toBeCloseTo(10.1, 0)
    expect(hospitalText(list[0]!)).toBe(
      'Uniklinik, Theodor-Stern-Kai 7, 60590 Frankfurt, Tel. +49 69 6301 0',
    )
  })

  it('Nominatim first: emergency departments and phone numbers from the extra tags', async () => {
    const urls: string[] = []
    const fake = (async (url: string) => {
      urls.push(url)
      return new Response(
        JSON.stringify([
          {
            lat: '50.095',
            lon: '8.66',
            name: 'Uniklinik',
            address: {
              road: 'Theodor-Stern-Kai',
              house_number: '7',
              postcode: '60590',
              city: 'Frankfurt am Main',
            },
            extratags: { emergency: 'yes', phone: '+49 69 6301 0' },
          },
          {
            lat: '50.12',
            lon: '8.69',
            name: 'Tagesklinik',
            address: { town: 'Bad Vilbel' },
            extratags: null,
          },
        ]),
      )
    }) as typeof fetch
    const list = await findHospitals(site, fake)
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain('amenity=hospital')
    expect(urls[0]).toContain('bounded=1')
    expect(list.map((h) => [h.name, h.emergency, h.phone])).toEqual([
      ['Uniklinik', true, '+49 69 6301 0'],
      ['Tagesklinik', false, undefined],
    ])
    expect(list[0]!.address).toBe('Theodor-Stern-Kai 7, 60590 Frankfurt am Main')
  })

  it('falls back to Photon and Overpass when a service refuses or finds nothing', async () => {
    const asked: string[] = []
    const fake = (async (url: string) => {
      asked.push(new URL(url).host)
      if (url.includes('nominatim')) return new Response('Access denied', { status: 403 })
      if (url.includes('photon')) return new Response(JSON.stringify({ features: [] }))
      return new Response(
        JSON.stringify({
          elements: [{ lat: 50.12, lon: 8.68, tags: { name: 'Klinik', emergency: 'yes' } }],
        }),
      )
    }) as typeof fetch
    const list = await findHospitals(site, fake)
    expect(asked).toEqual(['nominatim.openstreetmap.org', 'photon.komoot.io', 'overpass-api.de'])
    expect(list.map((h) => h.name)).toEqual(['Klinik'])
  })

  it('reports when no service answers', async () => {
    const fake = (async () => new Response('busy', { status: 429 })) as typeof fetch
    await expect(findHospitals(site, fake)).rejects.toThrow(/nicht erreichbar/)
  })

  it('reads Photon results', () => {
    const list = parsePhoton(
      {
        features: [
          {
            geometry: { coordinates: [8.66, 50.095] },
            properties: {
              name: 'Uniklinik',
              street: 'Theodor-Stern-Kai',
              housenumber: '7',
              postcode: '60590',
              city: 'Frankfurt',
            },
          },
          { geometry: { coordinates: [11.5, 48.1] }, properties: { name: 'Weit weg' } },
        ],
      },
      site,
    )
    expect(list.map((h) => [h.name, h.address])).toEqual([
      ['Uniklinik', 'Theodor-Stern-Kai 7, 60590 Frankfurt'],
    ])
  })
})

describe('weather', () => {
  it('reads DWD warnings (most severe first) and current wind', async () => {
    const fake = (async (url: string) =>
      new Response(
        JSON.stringify(
          url.includes('/alerts')
            ? {
                alerts: [
                  {
                    event_de: 'WINDBÖEN',
                    headline_de: 'Amtliche WARNUNG vor WINDBÖEN',
                    severity: 'minor',
                  },
                  {
                    event_de: 'STURMBÖEN',
                    headline_de: 'Amtliche WARNUNG vor STURMBÖEN',
                    severity: 'moderate',
                  },
                ],
              }
            : { weather: { wind_speed_10: 21.6, wind_gust_speed_10: 54, condition: 'dry' } },
        ),
      )) as typeof fetch
    const w = await fetchSiteWeather(site, fake)
    expect(w.warnings.map((x) => x.event)).toEqual(['STURMBÖEN', 'WINDBÖEN'])
    expect([w.wind, w.gusts]).toEqual([21.6, 54])
  })
})
