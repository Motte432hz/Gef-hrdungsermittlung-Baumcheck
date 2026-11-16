import { useParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { GuideView } from '../../help/GuideView'
import { getGuide } from '../../help/guides'
import { NotFoundPage } from '../NotFoundPage'

export function GuidePage() {
  const guide = getGuide(useParams().id ?? '')
  if (!guide) return <NotFoundPage />
  return (
    <div className="space-y-4">
      <PageHeader title={guide.title} back="/hilfe" backLabel="Hilfe" />
      <p className="text-lg text-stone-700 dark:text-stone-300">{guide.summary}</p>
      <GuideView guide={guide} />
    </div>
  )
}
