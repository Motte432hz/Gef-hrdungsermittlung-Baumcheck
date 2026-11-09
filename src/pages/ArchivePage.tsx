import { Card, PageTitle } from '../components/Card'

export function ArchivePage() {
  return (
    <div className="space-y-4">
      <PageTitle>Archiv</PageTitle>
      <Card>
        <p className="text-stone-600 dark:text-stone-400">
          Hier erscheinen abgeschlossene Protokolle mit Suche nach Kunde, Datum und Objekt.
        </p>
      </Card>
    </div>
  )
}
