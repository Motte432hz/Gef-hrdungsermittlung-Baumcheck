import { Link } from 'react-router'
import { Card, PageTitle } from '../components/Card'

export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <PageTitle>Seite nicht gefunden</PageTitle>
      <Card>
        <Link to="/" className="font-semibold text-brand-700 underline dark:text-brand-300">
          Zur Startseite
        </Link>
      </Card>
    </div>
  )
}
