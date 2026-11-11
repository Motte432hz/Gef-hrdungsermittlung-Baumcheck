import { useLocation, useParams } from 'react-router'

/**
 * For edit pages that save automatically under ".../:id" with "neu" for a new record.
 * `formKey` stays the same when the first save moves the URL from ".../neu" to the real id
 * (pass `{ state: { formKey } }` to that navigation), so the form keeps focus and input.
 * Any other navigation, also to another ".../neu", gives a fresh key.
 */
export function useRecordRoute(): { id?: string; formKey: string } {
  const { id } = useParams()
  const location = useLocation()
  const formKey =
    (location.state as { formKey?: string } | null)?.formKey ?? (id === 'neu' ? location.key : id!)
  return { id: id === 'neu' ? undefined : id, formKey }
}
