import { normalizeSearch } from './species'

/**
 * Catalogue of common arborist PPE and equipment for quick entry. Model names as sold on the
 * market; anything missing can be typed freely. Extend as needed.
 */
export const GEAR_CATEGORIES = {
  helmet: 'Helm & Gehörschutz',
  eyes: 'Augen- & Gesichtsschutz',
  trousers: 'Schnittschutzhose',
  jacket: 'Schnittschutzjacke & Warnkleidung',
  boots: 'Schnittschutzschuhe',
  gloves: 'Handschuhe',
  harness: 'Klettergurt',
  rope: 'Kletterseil',
  lanyard: 'Sicherungsseil / Lanyard',
  friction: 'Seilklemme / Klettergerät',
  ascender: 'Steigklemme',
  descender: 'Abseil- & Rettungsgerät',
  carabiner: 'Karabiner & Verbindungsmittel',
  rigging: 'Abseiltechnik (Rigging)',
  saver: 'Kambiumschoner',
  throw: 'Wurfzeug',
  chainsaw: 'Motorsäge',
  handsaw: 'Handsäge',
  radio: 'Funk & Kommunikation',
  firstaid: 'Erste Hilfe',
  other: 'Sonstiges',
} as const

export type GearCategory = keyof typeof GEAR_CATEGORIES

export interface GearCatalogItem {
  id: string
  name: string
  category: GearCategory
  aliases?: string[]
}

const items: [GearCategory, string, string[]?][] = [
  // Helmets
  ['helmet', 'Petzl Vertex Vent'],
  ['helmet', 'Petzl Vertex'],
  ['helmet', 'Petzl Strato Vent'],
  ['helmet', 'Kask Super Plasma'],
  ['helmet', 'Kask Zenith'],
  ['helmet', 'Pfanner Protos Integral Arborist', ['Protos']],
  ['helmet', 'Stihl ADVANCE Vent'],
  ['helmet', 'Kapselgehörschutz', ['Gehörschutz', 'Micky']],
  ['helmet', '3M Peltor WS LiteCom', ['Peltor', 'Funkgehörschutz']],
  // Eyes
  ['eyes', 'Gesichtsschutz (Netzvisier)', ['Visier']],
  ['eyes', 'Schutzbrille'],
  // Trousers
  ['trousers', 'Pfanner Gladiator'],
  ['trousers', 'Pfanner Ventilation'],
  ['trousers', 'Stihl ADVANCE X-Flex'],
  ['trousers', 'Husqvarna Technical Extreme'],
  ['trousers', 'Schnittschutzhose Klasse 1, Form A', ['Schnittschutz']],
  ['trousers', 'Schnittschutzhose Klasse 1, Form C (Rundumschutz)', ['Schnittschutz']],
  ['trousers', 'Schnittschutz-Latzhose', ['Latzhose']],
  // Jackets / visibility
  ['jacket', 'Schnittschutzjacke'],
  ['jacket', 'Warnweste (EN ISO 20471)', ['Warnschutz']],
  ['jacket', 'Warnschutzjacke (EN ISO 20471)', ['Warnschutz']],
  // Boots
  ['boots', 'Schnittschutzstiefel Klasse 1', ['Forststiefel']],
  ['boots', 'Haix Protector Forest'],
  ['boots', 'Haix Protector Ultra'],
  ['boots', 'Kletterschnittschutzschuh', ['Kletterschuh']],
  // Gloves
  ['gloves', 'Schnittschutzhandschuhe'],
  ['gloves', 'Kletterhandschuhe'],
  ['gloves', 'Arbeitshandschuhe'],
  // Harnesses
  ['harness', 'Petzl Sequoia'],
  ['harness', 'Petzl Sequoia SRT'],
  ['harness', 'Teufelberger treeMOTION', ['Treemotion']],
  ['harness', 'Teufelberger treeMOTION evo', ['Treemotion']],
  ['harness', 'Teufelberger treeMOTION pro', ['Treemotion']],
  ['harness', 'Edelrid TreeRex'],
  ['harness', 'Courant Koala'],
  ['harness', 'Sitzgurt (allgemein)', ['Gurt']],
  ['harness', 'Auffanggurt (allgemein)', ['Gurt']],
  // Ropes
  ['rope', 'Teufelberger Drenaline'],
  ['rope', 'Teufelberger Fly'],
  ['rope', 'Teufelberger Tachyon'],
  ['rope', 'Teufelberger Sirius'],
  ['rope', 'Samson Arbormaster'],
  ['rope', 'Samson Velocity'],
  ['rope', 'Kletterseil (Kernmantel, allgemein)', ['Seil']],
  ['rope', 'Statikseil', ['Seil']],
  // Lanyards
  ['lanyard', 'Stahlkern-Sicherungsseil', ['Stahlkernlanyard', 'Flipline']],
  ['lanyard', 'Petzl Zillon'],
  ['lanyard', 'Petzl Grillon'],
  ['lanyard', 'Positionierungsseil (Lanyard)', ['Flipline']],
  ['lanyard', 'Verbindungsmittel mit Falldämpfer', ['Falldämpfer']],
  // Friction devices / mechanical hitches
  ['friction', 'SpiderJack 3', ['Spider Jack']],
  ['friction', 'Petzl Zigzag', ['Zickzack', 'Zig Zag']],
  ['friction', 'Petzl Zigzag Plus', ['Zickzack', 'Zig Zag']],
  ['friction', 'Petzl Chicane'],
  ['friction', 'Rope Runner'],
  ['friction', 'Rope Runner Pro'],
  ['friction', 'Akimbo'],
  ['friction', 'ISC Rope Wrench', ['Ropewrench']],
  ['friction', 'Hitch-Climber-Rolle', ['Hitchclimber', 'Seilrolle']],
  ['friction', 'Klemmknoten-Cord (Prusik)', ['Prusik', 'Distel', 'Cord']],
  ['friction', 'Seilklemme (allgemein)', ['Seilklemme']],
  // Ascenders
  ['ascender', 'Petzl Ascension'],
  ['ascender', 'Petzl Croll'],
  ['ascender', 'Petzl Pantin', ['Fußklemme']],
  ['ascender', 'Petzl Micro Traxion'],
  ['ascender', 'Petzl Pro Traxion'],
  ['ascender', 'Petzl Basic'],
  // Descenders / rescue
  ['descender', 'Petzl ID'],
  ['descender', 'Petzl Rig'],
  ['descender', 'Abseilachter', ['Achter']],
  ['descender', 'Petzl JAG Rescue Kit', ['Rettungsset']],
  ['descender', 'Rettungsgerät (allgemein)', ['Rettung']],
  ['descender', 'Rettungsseil', ['Rettung']],
  // Carabiners
  ['carabiner', "Petzl Am'D", ['Amd']],
  ['carabiner', 'Petzl William'],
  ['carabiner', 'Petzl OK'],
  ['carabiner', 'DMM Ultra O'],
  ['carabiner', 'DMM Boa'],
  ['carabiner', 'HMS-Karabiner Twist-Lock', ['Karabiner']],
  ['carabiner', 'Ovalkarabiner Triple-Lock', ['Karabiner', 'Trilock']],
  ['carabiner', 'Stahlkarabiner mit Schraubverschluss', ['Karabiner']],
  ['carabiner', 'Schäkel', ['Schaekel']],
  // Rigging
  ['rigging', 'Abseilrolle (Rigging-Block)', ['Umlenkrolle', 'Rolle']],
  ['rigging', 'Abseilbremse (Porty)', ['Porty', 'Bremse']],
  ['rigging', 'GRCS (Good Rigging Control System)', ['Winde']],
  ['rigging', 'Abseilseil', ['Riggingseil', 'Seil']],
  ['rigging', 'Rundschlinge', ['Schlinge']],
  ['rigging', 'Bandschlinge', ['Schlinge']],
  ['rigging', 'Seilzug / Greifzug', ['Mehrzweckzug']],
  ['rigging', 'Fällkeil', ['Keil']],
  ['rigging', 'Hydraulischer Fällheber / Fällkeil', ['Keil']],
  // Cambium savers
  ['saver', 'Ring-Ring-Kambiumschoner', ['Ringring', 'Friction Saver']],
  ['saver', 'Kambiumschoner (Schlauch)'],
  // Throw gear
  ['throw', 'Wurfsack'],
  ['throw', 'Wurfleine'],
  ['throw', 'Big Shot (Wurfschleuder)', ['Bigshot', 'Schleuder']],
  ['throw', 'Wurfsack-Tasche (Cube)'],
  // Chainsaws
  ['chainsaw', 'Stihl MS 151 TC-M'],
  ['chainsaw', 'Stihl MS 194 T'],
  ['chainsaw', 'Stihl MS 201 TC-M'],
  ['chainsaw', 'Stihl MSA 161 T', ['Akku']],
  ['chainsaw', 'Stihl MSA 220 T', ['Akku']],
  ['chainsaw', 'Stihl MS 261'],
  ['chainsaw', 'Stihl MS 462'],
  ['chainsaw', 'Husqvarna T525'],
  ['chainsaw', 'Husqvarna T535i XP', ['Akku']],
  ['chainsaw', 'Husqvarna T540 XP II'],
  ['chainsaw', 'Husqvarna T540i XP', ['Akku']],
  ['chainsaw', 'Husqvarna 550 XP'],
  ['chainsaw', 'Echo CS-2511TES'],
  ['chainsaw', 'Hochentaster', ['Teleskopsäge']],
  // Handsaws
  ['handsaw', 'Silky Zubat'],
  ['handsaw', 'Silky Sugoi'],
  ['handsaw', 'Silky Hayauchi', ['Teleskopsäge']],
  ['handsaw', 'Klappsäge (allgemein)'],
  // Radio
  ['radio', 'Funkgerät', ['Funk']],
  ['radio', 'Helm-Headset (Funk/Bluetooth)', ['Headset', 'Funk']],
  // First aid
  ['firstaid', 'Erste-Hilfe-Set (DIN 13157)', ['Verbandkasten']],
  ['firstaid', 'Persönliches Erste-Hilfe-Päckchen', ['Verband']],
  ['firstaid', 'Rettungsdecke'],
  // Other
  ['other', 'Absperrband & Warnschilder', ['Absperrung']],
  ['other', 'Leitkegel / Pylonen', ['Absperrung']],
  ['other', 'Steigeisen (nur Fällung)', ['Steigeisen']],
]

const slug = (s: string) => normalizeSearch(s).replace(/ /g, '-')

export const gearCatalog: GearCatalogItem[] = items.map(([category, name, aliases]) => ({
  id: `${category}-${slug(name)}`,
  name,
  category,
  aliases,
}))

/** Instant search: word prefixes of name, aliases or category; "spider" → SpiderJack 3. */
export function searchGear(query: string, limit = 12): GearCatalogItem[] {
  const q = normalizeSearch(query)
  if (!q) return []
  const qCompact = q.replace(/ /g, '')
  const scored: { item: GearCatalogItem; score: number }[] = []
  for (const item of gearCatalog) {
    const fields = [item.name, ...(item.aliases ?? []), GEAR_CATEGORIES[item.category]].map(
      normalizeSearch,
    )
    let score = 0
    fields.forEach((f, i) => {
      const weight = i === 0 ? 0 : i === fields.length - 1 ? 30 : 10
      const words = f.split(' ')
      if (f.startsWith(q)) score = Math.max(score, 90 - weight)
      else if (f.replace(/ /g, '').startsWith(qCompact)) score = Math.max(score, 80 - weight)
      else if (words.some((w) => w.startsWith(q))) score = Math.max(score, 70 - weight)
      else if (f.replace(/ /g, '').includes(qCompact) && qCompact.length >= 3)
        score = Math.max(score, 50 - weight)
    })
    if (score > 0) scored.push({ item, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'de'))
    .slice(0, limit)
    .map((x) => x.item)
}
