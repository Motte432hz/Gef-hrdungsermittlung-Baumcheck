import { Navigate, useParams } from 'react-router'
import { personPath } from '../pages/profiles/teamPaths'

/** /profile/mitarbeiter/:id and /profile/subunternehmer/:id from before "Team & Partner". */
export function OldPersonRedirect({ kind }: { kind: 'employee' | 'sub' }) {
  const { id } = useParams()
  if (id === 'neu')
    return (
      <Navigate
        to={`${personPath('neu')}?${kind === 'sub' ? 'art=sub' : 'firma=eigene'}`}
        replace
      />
    )
  return <Navigate to={personPath(id!)} replace />
}
