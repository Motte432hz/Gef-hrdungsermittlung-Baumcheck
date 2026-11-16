import { PageTitle } from '../../components/Card'
import { LinkList, ListLink } from '../../components/ListLink'

/** Help centre: entry point for explanations and guides. */
export function HelpPage() {
  return (
    <div className="space-y-4">
      <PageTitle>Hilfe</PageTitle>
      <LinkList>
        <ListLink to="/hilfe/begriffe" title="Begriffe A–Z" meta="Fachbegriffe kurz erklärt" />
      </LinkList>
    </div>
  )
}
