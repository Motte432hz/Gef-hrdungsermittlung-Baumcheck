export type NavItem = {
  to: string
  label: string
  icon: 'home' | 'archive' | 'profiles' | 'settings'
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Start', icon: 'home' },
  { to: '/archiv', label: 'Archiv', icon: 'archive' },
  { to: '/profile', label: 'Profile', icon: 'profiles' },
  { to: '/einstellungen', label: 'Einstellungen', icon: 'settings' },
]
