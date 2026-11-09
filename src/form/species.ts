import raw from './definitions/tree-species-1.0.json'
import type { Answer, Answers } from '../domain/types'

export type Activity = 'climbing' | 'pruning' | 'felling' | 'rigging' | 'chipping'
export type AdviceKey = Activity | 'general'

export interface TreeHazard {
  id: string
  title: string
  text: string
  advice: Partial<Record<AdviceKey, string>>
}

export interface TreeSpecies {
  id: string
  /** German name */
  de: string
  /** Botanical (Latin) name */
  la: string
  group: 'laub' | 'nadel'
  native: boolean
  hazards: string[]
  note?: string
  aliases?: string[]
}

const data = raw as { version: string; hazards: TreeHazard[]; species: TreeSpecies[] }

export const SPECIES_VERSION = data.version
export const allSpecies: TreeSpecies[] = data.species
export const allHazards: TreeHazard[] = data.hazards
const speciesById = new Map(allSpecies.map((s) => [s.id, s]))
const hazardById = new Map(allHazards.map((h) => [h.id, h]))

/** Answer value for a species that is not in the list. */
export const OTHER_SPECIES = 'other'

export const getSpecies = (id: string | undefined) => (id ? speciesById.get(id) : undefined)
export const getHazard = (id: string) => hazardById.get(id)

export const ACTIVITY_LABELS: Record<AdviceKey, string> = {
  general: 'Allgemein',
  climbing: 'Beim Klettern',
  pruning: 'Bei der Kronenpflege',
  felling: 'Bei der Fällung',
  rigging: 'Beim Abseilen',
  chipping: 'Beim Hacken',
}

/** Lower case, umlauts and ß folded, punctuation removed – for forgiving search. */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Searches German, Latin and alternative names. Best matches first. */
export function searchSpecies(query: string, limit = 12): TreeSpecies[] {
  const q = normalizeSearch(query)
  if (!q) return []
  // "bergahorn" should also find "Berg-Ahorn".
  const qCompact = q.replace(/ /g, '')
  const scored: { s: TreeSpecies; score: number }[] = []
  for (const s of allSpecies) {
    const names = [s.de, s.la, ...(s.aliases ?? [])].map(normalizeSearch)
    let score = 0
    for (const [i, n] of names.entries()) {
      const words = n.split(' ')
      if (n === q) score = Math.max(score, 100 - i)
      else if (n.startsWith(q)) score = Math.max(score, 80 - i)
      else if (n.replace(/ /g, '').startsWith(qCompact)) score = Math.max(score, 70 - i)
      else if (words.some((w) => w.startsWith(q))) score = Math.max(score, 60 - i)
      else if (n.includes(q)) score = Math.max(score, 40 - i)
    }
    if (score > 0) scored.push({ s, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.s.de.localeCompare(b.s.de, 'de'))
    .slice(0, limit)
    .map((x) => x.s)
}

/** "Berg-Ahorn (Acer pseudoplatanus)" or the free text for other species. */
export function speciesLabel(answer: Answer | undefined): string | undefined {
  if (!answer) return undefined
  if (answer.value === OTHER_SPECIES) return answer.otherText?.trim() || undefined
  const s = getSpecies(typeof answer.value === 'string' ? answer.value : undefined)
  return s ? `${s.de} (${s.la})` : undefined
}

const PRUNING = [
  'deadwood',
  'crown_maintenance',
  'crown_reduction',
  'crown_bracing',
  'crown_safety_cut',
]
const FELLING = ['felling', 'felling_rigging', 'felling_crane']

/** Activities planned in this assessment. Empty plan → all activities (nothing hidden). */
export function plannedActivities(answers: Answers): Set<Activity> {
  const jobTypes = (answers['job.types']?.value as string[] | undefined) ?? []
  const workTypes = (answers['work.types']?.value as string[] | undefined) ?? []
  if (jobTypes.length === 0 && workTypes.length === 0) {
    return new Set(['climbing', 'pruning', 'felling', 'rigging', 'chipping'])
  }
  const out = new Set<Activity>(['chipping'])
  if (jobTypes.includes('rope_access')) out.add('climbing')
  if (workTypes.some((w) => PRUNING.includes(w))) out.add('pruning')
  if (workTypes.some((w) => FELLING.includes(w))) out.add('felling')
  if (
    workTypes.includes('felling_rigging') ||
    answers['site.riggingRequired']?.value === 'present'
  ) {
    out.add('rigging')
  }
  return out
}

export interface SpeciesHazardView {
  hazard: TreeHazard
  /** Advice lines relevant to the planned work (general first). */
  advice: { key: AdviceKey; text: string }[]
  /** True if the hazard has advice for at least one planned activity. */
  relevant: boolean
}

const ADVICE_ORDER: AdviceKey[] = [
  'general',
  'climbing',
  'pruning',
  'felling',
  'rigging',
  'chipping',
]

/** Typical hazards of a species, filtered and ordered for the planned work. */
export function hazardsForSpecies(
  species: TreeSpecies,
  activities: Set<Activity>,
): SpeciesHazardView[] {
  const views = species.hazards
    .map(getHazard)
    .filter((h): h is TreeHazard => !!h)
    .map((hazard) => {
      const advice = ADVICE_ORDER.filter(
        (k) => hazard.advice[k] && (k === 'general' || activities.has(k)),
      ).map((key) => ({ key, text: hazard.advice[key]! }))
      const relevant =
        !!hazard.advice.general ||
        ADVICE_ORDER.some(
          (k) => k !== 'general' && hazard.advice[k] && activities.has(k as Activity),
        )
      return { hazard, advice, relevant }
    })
  return [...views.filter((v) => v.relevant), ...views.filter((v) => !v.relevant)]
}
