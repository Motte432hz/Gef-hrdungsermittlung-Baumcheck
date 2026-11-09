import type { PersonKind } from '../../domain/types'

export const workerKinds: Record<
  PersonKind,
  { path: string; title: string; single: string; empty: string }
> = {
  employee: {
    path: '/profile/mitarbeiter',
    title: 'Mitarbeiter',
    single: 'Mitarbeiter/in',
    empty: 'Noch keine Mitarbeiter angelegt.',
  },
  subcontractor: {
    path: '/profile/subunternehmer',
    title: 'Subunternehmer',
    single: 'Subunternehmer/in',
    empty:
      'Noch keine Subunternehmer gespeichert. Personen, die du im Einsatz neu erfasst, kannst du später hier speichern.',
  },
}
