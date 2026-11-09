import type { Role } from './types'

export const ROLE_LABELS: Record<Role, string> = {
  supervisor: 'Aufsicht',
  climber: 'Kletterer/in',
  ground: 'Bodenperson',
  safety_lookout: 'Sicherungsposten',
  platform_operator: 'Bediener/in Hubarbeitsbühne',
  crane_signaller: 'Anschläger/in / Einweiser/in Kran',
}
