import { useState } from 'react'
import { useNavigate } from 'react-router'
import { db } from '../db/db'
import { startAssessment } from '../wizard/start'
import { useOrganization } from '../app/useOrganization'

export const META_WELCOME_DISMISSED = 'welcomeDismissed'

/** Starts a practice run and opens it. */
export function usePracticeStart() {
  const org = useOrganization()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  return {
    busy,
    start: async () => {
      if (!org || busy) return
      setBusy(true)
      const a = await startAssessment(db, org.id, { practice: true })
      navigate(`/einsatz/${a.id}/job`)
    },
  }
}
