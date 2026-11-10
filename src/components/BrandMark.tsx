import { useOrganization } from '../app/useOrganization'
import { useObjectUrl } from '../lib/useObjectUrl'

/**
 * App logo area: the company's own logo and name once set up ("mit BaumCheck" below),
 * otherwise the BaumCheck logo.
 */
export function BrandMark({
  size = 'md',
  onColor = false,
}: {
  size?: 'sm' | 'md'
  onColor?: boolean
}) {
  const org = useOrganization()
  const logoUrl = useObjectUrl(org?.logo)
  const img = size === 'sm' ? 'size-8' : 'size-10'
  if (!org?.name && !org?.logo) {
    return (
      <span className="flex items-center gap-2">
        <img src="/favicon.svg" alt="" className={img} />
        <span className={`${size === 'sm' ? 'text-lg' : 'text-xl'} font-bold`}>BaumCheck</span>
      </span>
    )
  }
  return (
    <span className="flex min-w-0 items-center gap-2" data-testid="brand-mark">
      <img
        src={logoUrl ?? '/favicon.svg'}
        alt=""
        className={`${img} shrink-0 rounded-md bg-white object-contain p-0.5`}
      />
      <span className="min-w-0 leading-tight">
        <span className={`block truncate font-bold ${size === 'sm' ? 'text-base' : 'text-lg'}`}>
          {org.name || 'BaumCheck'}
        </span>
        <span
          className={`block text-xs ${onColor ? 'text-white/80' : 'text-stone-500 dark:text-stone-400'}`}
        >
          mit BaumCheck
        </span>
      </span>
    </span>
  )
}
