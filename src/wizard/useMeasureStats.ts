import { useEffect, useState } from 'react'
import { db } from '../db/db'
import { measureStats, type MeasureStats } from './inputs/measures'

/**
 * Measures used in the company's earlier protocols (not the open one, not practice runs).
 * Computed once when the wizard opens – not on every keystroke.
 */
export function useMeasureStats(organizationId: string, assessmentId: string) {
  const [stats, setStats] = useState<MeasureStats>()
  useEffect(() => {
    let alive = true
    void (async () => {
      const assessments = await db.assessments
        .where('organizationId')
        .equals(organizationId)
        .filter((a) => a.id !== assessmentId && !a.practice && !a.deletedAt)
        .toArray()
      const ids = new Set(assessments.map((a) => a.id))
      const trees = await db.trees
        .where('organizationId')
        .equals(organizationId)
        .filter((t) => ids.has(t.assessmentId))
        .toArray()
      const result = measureStats([...assessments, ...trees].map((x) => x.answers))
      if (alive) setStats(result)
    })()
    return () => {
      alive = false
    }
  }, [organizationId, assessmentId])
  return stats
}
