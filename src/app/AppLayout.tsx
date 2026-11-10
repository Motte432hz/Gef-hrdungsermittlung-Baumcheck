import { NavLink, Outlet } from 'react-router'
import { navItems } from './nav'
import { Icon } from '../components/Icon'
import { OnlineBadge } from '../components/OnlineBadge'
import { BrandMark } from '../components/BrandMark'
import { useOrganization } from './useOrganization'

const linkBase =
  'flex items-center gap-3 rounded-xl font-semibold transition-colors min-h-14 focus-visible:outline-3'

export function AppLayout() {
  const org = useOrganization()
  // With company colours the header itself is coloured, so the branding is clearly visible.
  const branded = !!(org?.brandInApp && org.brandColor)
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Side navigation: tablet and desktop */}
      <nav
        aria-label="Hauptnavigation"
        className="hidden w-60 shrink-0 flex-col gap-1 border-r border-stone-200 bg-white p-3 md:flex dark:border-stone-800 dark:bg-stone-900"
      >
        <div
          className={`mb-4 flex items-center gap-3 rounded-xl px-2 py-3 ${branded ? 'bg-brand-700 text-white dark:bg-brand-900' : ''}`}
        >
          <BrandMark onColor={branded} />
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `${linkBase} px-3 ${
                isActive
                  ? 'border-l-4 border-accent-500 bg-brand-700 text-white'
                  : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800'
              }`
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`pt-safe sticky top-0 z-10 border-b backdrop-blur ${
            branded
              ? 'border-brand-900 bg-brand-700 text-white dark:bg-brand-900'
              : 'border-stone-200 bg-white/95 dark:border-stone-800 dark:bg-stone-900/95'
          }`}
        >
          <div className="flex min-h-14 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2 md:invisible">
              <BrandMark size="sm" onColor={branded} />
            </div>
            <OnlineBadge />
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-28 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar: phones */}
      <nav
        aria-label="Hauptnavigation"
        className="pb-safe fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-stone-200 bg-white md:hidden dark:border-stone-800 dark:bg-stone-900"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-0.5 border-t-4 text-xs font-semibold ${
                isActive
                  ? 'border-accent-500 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-stone-600 dark:text-stone-400'
              }`
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
