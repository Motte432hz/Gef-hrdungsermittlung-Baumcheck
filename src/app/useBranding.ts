import { useEffect } from 'react'
import { makePalette, PALETTE_STEPS } from '../lib/color'
import { useOrganization } from './useOrganization'

const DEFAULT_THEME_COLOR = '#1f5130'

/** Applies the organisation's brand colour to the app (CSS variables used by Tailwind). */
export function useBranding() {
  const org = useOrganization()
  const color = org?.brandInApp ? org.brandColor : undefined
  const color2 = org?.brandInApp ? org.brandColor2 : undefined
  useEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!color) {
      for (const step of PALETTE_STEPS) {
        root.style.removeProperty(`--color-brand-${step}`)
        root.style.removeProperty(`--color-accent-${step}`)
      }
      meta?.setAttribute('content', DEFAULT_THEME_COLOR)
      return
    }
    const p = makePalette(color)
    const p2 = makePalette(color2 ?? color)
    for (const step of PALETTE_STEPS) {
      root.style.setProperty(`--color-brand-${step}`, p[step])
      root.style.setProperty(`--color-accent-${step}`, p2[step])
    }
    meta?.setAttribute('content', p[700])
  }, [color, color2])
}
