import { Button } from '../components/Button'
import { Card, PageTitle } from '../components/Card'
import { InstallHint } from '../components/InstallHint'

export function HomePage() {
  return (
    <div className="space-y-4">
      <PageTitle>Gefährdungsermittlung</PageTitle>

      <Card>
        <Button className="min-h-16 w-full text-lg" disabled>
          + Neue Gefährdungsermittlung
        </Button>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Der Assistent folgt in einem der nächsten Schritte.
        </p>
      </Card>

      <Card title="Entwürfe">
        <p className="text-stone-600 dark:text-stone-400">Noch keine angefangenen Einsätze.</p>
      </Card>

      <InstallHint />
    </div>
  )
}
