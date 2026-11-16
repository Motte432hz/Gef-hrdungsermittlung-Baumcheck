import { db } from '../db/db'

/** One-time tips at the place where a feature is useful. Shown until dismissed. */
export const stepTips: Record<string, { id: string; text: string }> = {
  job: {
    id: 'terms',
    text: 'Gepunktet unterstrichene Fachbegriffe antippen – dann erscheint eine kurze Erklärung. Das „?“ oben rechts hilft zu jedem Schritt.',
  },
  site: {
    id: 'emergency',
    text: 'Die Notfallinfo unten fasst alles zusammen, was der Leitstelle im Notfall durchgegeben werden muss.',
  },
  team: {
    id: 'roles',
    text: 'Gespeicherte Personen nur antippen – die Rollen schlägt die App passend zu den Qualifikationen vor.',
  },
  tree: {
    id: 'copy-tree',
    text: 'Für ähnliche Bäume unten „+ Weiterer Baum wie …“ nutzen – Art, Größe und Befund werden übernommen.',
  },
  treeAssessment: {
    id: 'gates',
    text: 'Ist ein Bereich am Baum unauffällig, reicht dort ein Tipp – alle Einzelfragen dieses Bereichs entfallen.',
  },
  workplace: {
    id: 'all-yes',
    text: 'Mit „Alle offenen mit Ja beantworten“ ist ein Abschnitt in einem Tipp erledigt. Danach kurz durchsehen, ob alles stimmt.',
  },
  summary: {
    id: 'jump',
    text: 'Einen offenen Punkt antippen, um direkt zur Frage zu springen. Unterschrieben wird erst, wenn alles besprochen ist.',
  },
}

export const TIP_META_PREFIX = 'tip:'

/** Shows all tips again. */
export async function resetTips(): Promise<void> {
  const keys = await db.meta.filter((m) => m.key.startsWith(TIP_META_PREFIX)).primaryKeys()
  await db.meta.bulkDelete(keys)
}
