import { QUALIFICATION_LABELS, type Worker } from './types'

/** A certificate or a PPE inspection that has expired or is due soon. */
export interface DueItem {
  workerId: string
  kind: 'qualification' | 'gear'
  label: string
  date: string
  /** Negative = overdue by that many days. */
  days: number
  status: 'overdue' | 'soon'
}

export const DUE_SOON_DAYS = 60

const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
const daysFrom = (today: string, date: string) => Math.round((day(date) - day(today)) / 86_400_000)

/** All deadlines of active people: overdue first, then by date. */
export function dueItems(workers: Worker[], today: string, soonDays = DUE_SOON_DAYS): DueItem[] {
  const out: DueItem[] = []
  const add = (w: Worker, kind: DueItem['kind'], label: string, date?: string) => {
    if (!date) return
    const days = daysFrom(today, date)
    if (days > soonDays) return
    out.push({ workerId: w.id, kind, label, date, days, status: days < 0 ? 'overdue' : 'soon' })
  }
  for (const w of workers) {
    if (!w.active || w.deletedAt) continue
    for (const q of w.qualifications)
      add(w, 'qualification', `Nachweis ${QUALIFICATION_LABELS[q.type]}`, q.validUntil)
    for (const g of w.gear ?? []) add(w, 'gear', `Prüfung ${g.name}`, g.nextInspection)
  }
  return out.sort((a, b) => a.days - b.days)
}

/** "seit 3 Tagen fällig", "heute fällig", "in 12 Tagen". */
export function dueText(days: number): string {
  if (days < 0) return days === -1 ? 'seit gestern fällig' : `seit ${-days} Tagen fällig`
  if (days === 0) return 'heute fällig'
  return days === 1 ? 'morgen fällig' : `in ${days} Tagen fällig`
}
