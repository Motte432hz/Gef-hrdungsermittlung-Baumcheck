import { describe, expect, it } from 'vitest'
import { findHospitals, hospitalText, parseHospitals } from './hospital'
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

  it('asks Overpass around the site', async () => {
    let body = ''
    const fake = (async (_url: string, init: RequestInit) => {
      body = decodeURIComponent(String(init.body))
      return new Response(JSON.stringify({ elements: [] }))
    }) as typeof fetch
    expect(await findHospitals(site, fake)).toEqual([])
    expect(body).toContain('around:40000,50.11,8.68')
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
