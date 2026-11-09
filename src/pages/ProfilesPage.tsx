import { Card, PageTitle } from '../components/Card'

const sections = [
  'Firma (Logo, Adresse, Kontakt)',
  'Mitarbeiter',
  'Subunternehmer',
  'Standard-Ausrüstung',
  'Kunden und Objekte',
]

export function ProfilesPage() {
  return (
    <div className="space-y-4">
      <PageTitle>Profile</PageTitle>
      <Card>
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {sections.map((s) => (
            <li key={s} className="flex min-h-14 items-center text-stone-500 dark:text-stone-400">
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Die Profilverwaltung folgt in einem der nächsten Schritte.
        </p>
      </Card>
    </div>
  )
}
